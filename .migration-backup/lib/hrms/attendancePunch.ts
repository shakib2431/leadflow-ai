import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type AttendancePunch = {
  employee_id: string;
  date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  source: 'db' | 'fallback';
};

type FallbackPunch = {
  employee_id: string;
  date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  updated_at: string;
};

const TMP_DIR = path.join(process.cwd(), 'tmp');
const PUNCH_FILE = path.join(TMP_DIR, 'attendance-punches.json');

function isColumnMissingError(message: string) {
  const text = String(message || '').toLowerCase();
  return text.includes('check_in_at') || text.includes('check_out_at');
}

function normalizeDate(input?: string | null) {
  if (!input) return new Date().toISOString().slice(0, 10);
  const text = String(input).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

async function readFallbackRows() {
  try {
    const raw = await readFile(PUNCH_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [] as FallbackPunch[];
    return parsed
      .map((row: any) => ({
        employee_id: String(row?.employee_id || '').trim(),
        date: String(row?.date || '').trim(),
        check_in_at: row?.check_in_at ? String(row.check_in_at) : null,
        check_out_at: row?.check_out_at ? String(row.check_out_at) : null,
        updated_at: row?.updated_at ? String(row.updated_at) : new Date().toISOString(),
      }))
      .filter((row: FallbackPunch) => row.employee_id && row.date);
  } catch {
    return [] as FallbackPunch[];
  }
}

async function writeFallbackRows(rows: FallbackPunch[]) {
  await mkdir(TMP_DIR, { recursive: true });
  await writeFile(PUNCH_FILE, JSON.stringify(rows, null, 2), 'utf8');
}

async function upsertFallbackPunch(row: FallbackPunch) {
  const rows = await readFallbackRows();
  const key = `${row.employee_id}:${row.date}`;
  const existingIdx = rows.findIndex((item) => `${item.employee_id}:${item.date}` === key);

  if (existingIdx >= 0) {
    rows[existingIdx] = {
      ...rows[existingIdx],
      check_in_at: row.check_in_at ?? rows[existingIdx].check_in_at,
      check_out_at: row.check_out_at ?? rows[existingIdx].check_out_at,
      updated_at: row.updated_at,
    };
  } else {
    rows.push(row);
  }

  await writeFallbackRows(rows);
}

export async function getPunchMapForDate(employeeIds: string[], dateInput: string) {
  const date = normalizeDate(dateInput);
  if (!date || employeeIds.length === 0) return {} as Record<string, AttendancePunch>;

  const { data, error } = await supabaseAdmin
    .from('attendance_records')
    .select('employee_id, date, check_in_at, check_out_at')
    .eq('date', date)
    .in('employee_id', employeeIds);

  if (!error) {
    const map: Record<string, AttendancePunch> = {};
    (data || []).forEach((row: any) => {
      const employeeId = String(row.employee_id || '').trim();
      if (!employeeId) return;
      map[employeeId] = {
        employee_id: employeeId,
        date,
        check_in_at: row.check_in_at ? String(row.check_in_at) : null,
        check_out_at: row.check_out_at ? String(row.check_out_at) : null,
        source: 'db',
      };
    });
    return map;
  }

  if (!isColumnMissingError(error.message)) {
    throw new Error(error.message);
  }

  const fallback = await readFallbackRows();
  const idSet = new Set(employeeIds.map((id) => String(id).trim()));
  const map: Record<string, AttendancePunch> = {};

  fallback
    .filter((row) => row.date === date && idSet.has(row.employee_id))
    .forEach((row) => {
      map[row.employee_id] = {
        employee_id: row.employee_id,
        date,
        check_in_at: row.check_in_at,
        check_out_at: row.check_out_at,
        source: 'fallback',
      };
    });

  return map;
}

export async function getEmployeePunchForDate(employeeIdInput: string, dateInput?: string) {
  const employeeId = String(employeeIdInput || '').trim();
  const date = normalizeDate(dateInput);
  if (!employeeId || !date) return null;

  const map = await getPunchMapForDate([employeeId], date);
  return map[employeeId] || null;
}

export async function recordAttendancePunch(input: {
  employeeId: string;
  date?: string;
  action: 'check_in' | 'check_out';
}) {
  const employeeId = String(input.employeeId || '').trim();
  const date = normalizeDate(input.date);
  if (!employeeId || !date) {
    throw new Error('employeeId and valid date are required');
  }

  const nowIso = new Date().toISOString();
  const existingPunch = await getEmployeePunchForDate(employeeId, date);

  if (input.action === 'check_in') {
    if (existingPunch?.check_in_at) {
      return existingPunch;
    }

    const withPunch = await supabaseAdmin
      .from('attendance_records')
      .upsert(
        {
          employee_id: employeeId,
          date,
          status: 'present',
          check_in_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: 'employee_id,date' }
      );

    if (!withPunch.error) {
      return {
        employee_id: employeeId,
        date,
        check_in_at: nowIso,
        check_out_at: existingPunch?.check_out_at || null,
        source: 'db' as const,
      };
    }

    if (!isColumnMissingError(withPunch.error.message)) {
      throw new Error(withPunch.error.message);
    }

    const statusOnly = await supabaseAdmin
      .from('attendance_records')
      .upsert(
        {
          employee_id: employeeId,
          date,
          status: 'present',
          updated_at: nowIso,
        },
        { onConflict: 'employee_id,date' }
      );

    if (statusOnly.error) throw new Error(statusOnly.error.message);

    await upsertFallbackPunch({
      employee_id: employeeId,
      date,
      check_in_at: nowIso,
      check_out_at: existingPunch?.check_out_at || null,
      updated_at: nowIso,
    });

    return {
      employee_id: employeeId,
      date,
      check_in_at: nowIso,
      check_out_at: existingPunch?.check_out_at || null,
      source: 'fallback' as const,
    };
  }

  const checkInAt = existingPunch?.check_in_at || null;
  if (!checkInAt) {
    throw new Error('Check-in required before check-out');
  }

  if (existingPunch?.check_out_at) {
    return existingPunch;
  }

  const withPunch = await supabaseAdmin
    .from('attendance_records')
    .upsert(
      {
        employee_id: employeeId,
        date,
        status: 'present',
        check_out_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: 'employee_id,date' }
    );

  if (!withPunch.error) {
    return {
      employee_id: employeeId,
      date,
      check_in_at: checkInAt,
      check_out_at: nowIso,
      source: 'db' as const,
    };
  }

  if (!isColumnMissingError(withPunch.error.message)) {
    throw new Error(withPunch.error.message);
  }

  const statusOnly = await supabaseAdmin
    .from('attendance_records')
    .upsert(
      {
        employee_id: employeeId,
        date,
        status: 'present',
        updated_at: nowIso,
      },
      { onConflict: 'employee_id,date' }
    );

  if (statusOnly.error) throw new Error(statusOnly.error.message);

  await upsertFallbackPunch({
    employee_id: employeeId,
    date,
    check_in_at: checkInAt,
    check_out_at: nowIso,
    updated_at: nowIso,
  });

  return {
    employee_id: employeeId,
    date,
    check_in_at: checkInAt,
    check_out_at: nowIso,
    source: 'fallback' as const,
  };
}
