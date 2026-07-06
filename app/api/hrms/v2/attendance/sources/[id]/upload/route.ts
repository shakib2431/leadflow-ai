import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { getAttendanceSourceById, runAttendanceSync, writeAttendanceSyncArtifact } from '@/lib/hrms/attendanceSources';
import { supabaseAdmin } from '@/lib/supabase-admin';

const VALID_STATUSES = new Set(['present', 'absent', 'half_day']);

function normalizeDate(input?: string | null) {
  const value = String(input || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

function splitCsvLine(line: string) {
  const result: string[] = [];
  let token = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        token += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      result.push(token.trim());
      token = '';
      continue;
    }

    token += char;
  }

  result.push(token.trim());
  return result;
}

async function resolveEmployeeIdFromCode(employeeCode: string) {
  const code = String(employeeCode || '').trim();
  if (!code) return null;
  const { data } = await supabaseAdmin.from('employees').select('id').eq('employee_code', code).maybeSingle();
  return data?.id || null;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const route = await params;
    const sourceId = String(route?.id || '').trim();
    const source = await getAttendanceSourceById(sourceId);

    if (!source) {
      return NextResponse.json({ error: 'Attendance source not found' }, { status: 404 });
    }

    const contentType = String(req.headers.get('content-type') || '').toLowerCase();
    let csvText = '';
    let syncDate = new Date().toISOString().slice(0, 10);

    if (contentType.includes('application/json')) {
      const body = await req.json();
      csvText = String(body?.csv_text || '').trim();
      syncDate = normalizeDate(String(body?.sync_date || '').trim()) || syncDate;
      if (!csvText) {
        return NextResponse.json({ error: 'csv_text is required for JSON upload payload' }, { status: 422 });
      }
    } else {
      const form = await req.formData();
      const file = form.get('file');
      syncDate = normalizeDate(String(form.get('sync_date') || '').trim()) || syncDate;

      if (!file || typeof (file as File).text !== 'function') {
        return NextResponse.json({ error: 'CSV file is required in form field "file"' }, { status: 422 });
      }

      csvText = await (file as File).text();
    }

    const lines = csvText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV must include header and at least one data row' }, { status: 422 });
    }

    const headerColumns = splitCsvLine(lines[0]).map((column) => column.toLowerCase());
    const employeeIdIndex = headerColumns.indexOf('employee_id');
    const employeeCodeIndex = headerColumns.indexOf('employee_code');
    const dateIndex = headerColumns.indexOf('date');
    const statusIndex = headerColumns.indexOf('status');

    if (statusIndex < 0 || (employeeIdIndex < 0 && employeeCodeIndex < 0)) {
      return NextResponse.json({ error: 'CSV header must include status and either employee_id or employee_code' }, { status: 422 });
    }

    const errors: Array<Record<string, unknown>> = [];
    const entries: Array<{ employee_id: string; date: string; status: 'present' | 'absent' | 'half_day' }> = [];

    for (let i = 1; i < lines.length; i += 1) {
      const rowNumber = i + 1;
      const columns = splitCsvLine(lines[i]);
      const rawStatus = String(columns[statusIndex] || '').trim().toLowerCase();
      const rowDate = normalizeDate(columns[dateIndex] || '') || syncDate;
      const employeeIdFromCsv = employeeIdIndex >= 0 ? String(columns[employeeIdIndex] || '').trim() : '';
      const employeeCode = employeeCodeIndex >= 0 ? String(columns[employeeCodeIndex] || '').trim() : '';

      if (!VALID_STATUSES.has(rawStatus)) {
        errors.push({ row: rowNumber, reason: 'Invalid status', value: rawStatus });
        continue;
      }

      if (!rowDate) {
        errors.push({ row: rowNumber, reason: 'Invalid date format. Use YYYY-MM-DD.' });
        continue;
      }

      let employeeId = employeeIdFromCsv;
      if (!employeeId && employeeCode) {
        employeeId = String((await resolveEmployeeIdFromCode(employeeCode)) || '');
      }

      if (!employeeId) {
        errors.push({ row: rowNumber, reason: 'Unable to resolve employee id', employee_code: employeeCode || null });
        continue;
      }

      entries.push({
        employee_id: employeeId,
        date: rowDate,
        status: rawStatus as 'present' | 'absent' | 'half_day',
      });
    }

    let artifact: { artifact_id: string; artifact_file: string } | null = null;
    if (errors.length > 0) {
      artifact = await writeAttendanceSyncArtifact({
        source_id: sourceId,
        sync_date: syncDate,
        total_rows: lines.length - 1,
        valid_rows: entries.length,
        invalid_rows: errors.length,
        errors,
      });
    }

    if (entries.length === 0) {
      return NextResponse.json(
        {
          error: 'No valid rows available for sync',
          data: {
            source_id: sourceId,
            sync_date: syncDate,
            total_rows: lines.length - 1,
            valid_rows: 0,
            invalid_rows: errors.length,
            artifact,
          },
        },
        { status: 422 }
      );
    }

    const syncLog = await runAttendanceSync({
      sourceId,
      syncDate,
      entries,
      triggeredBy: auth.userId,
      metadata: {
        ingest_mode: contentType.includes('application/json') ? 'json_csv_text' : 'multipart_csv_file',
        artifact_id: artifact?.artifact_id || null,
        artifact_file: artifact?.artifact_file || null,
      },
    });

    return NextResponse.json({
      data: {
        source_id: sourceId,
        sync_date: syncDate,
        total_rows: lines.length - 1,
        valid_rows: entries.length,
        invalid_rows: errors.length,
        artifact,
        sync_log: syncLog,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to process CSV upload' }, { status: 400 });
  }
}
