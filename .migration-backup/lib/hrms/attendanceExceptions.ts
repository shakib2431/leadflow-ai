import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type AttendanceExceptionType = 'missing_attendance' | 'unplanned_absence' | 'pending_correction' | 'repeated_absence';
export type AttendanceExceptionSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AttendanceExceptionStatus = 'open' | 'in_review' | 'resolved' | 'dismissed';

export type AttendanceExceptionRow = {
  id: string;
  employee_id: string;
  date: string;
  exception_type: AttendanceExceptionType;
  severity: AttendanceExceptionSeverity;
  status: AttendanceExceptionStatus;
  title: string;
  description: string;
  detected_from: Record<string, unknown>;
  resolution_note: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  created_at: string;
  updated_at: string;
  employees?: { first_name?: string; last_name?: string; employee_code?: string };
};

const FILE_DIR = path.join(process.cwd(), 'tmp');
const FILE_PATH = path.join(FILE_DIR, 'attendance-exceptions.json');
const VALID_TYPES = new Set<AttendanceExceptionType>(['missing_attendance', 'unplanned_absence', 'pending_correction', 'repeated_absence']);
const VALID_SEVERITIES = new Set<AttendanceExceptionSeverity>(['low', 'medium', 'high', 'critical']);
const VALID_STATUSES = new Set<AttendanceExceptionStatus>(['open', 'in_review', 'resolved', 'dismissed']);

function normalizeDate(input?: string | null) {
  const text = String(input || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  return text;
}

function isMissingTableError(message: string) {
  const text = String(message || '').toLowerCase();
  return (
    (text.includes('relation') && text.includes('attendance_exceptions') && text.includes('does not exist')) ||
    (text.includes('could not find the table') && text.includes('attendance_exceptions'))
  );
}

function normalizeRow(input: any): AttendanceExceptionRow {
  const now = new Date().toISOString();
  const type = String(input?.exception_type || '').trim().toLowerCase() as AttendanceExceptionType;
  const severity = String(input?.severity || '').trim().toLowerCase() as AttendanceExceptionSeverity;
  const status = String(input?.status || '').trim().toLowerCase() as AttendanceExceptionStatus;

  return {
    id: String(input?.id || crypto.randomUUID()),
    employee_id: String(input?.employee_id || '').trim(),
    date: normalizeDate(input?.date) || now.slice(0, 10),
    exception_type: VALID_TYPES.has(type) ? type : 'missing_attendance',
    severity: VALID_SEVERITIES.has(severity) ? severity : 'medium',
    status: VALID_STATUSES.has(status) ? status : 'open',
    title: String(input?.title || 'Attendance Exception').trim() || 'Attendance Exception',
    description: String(input?.description || '').trim(),
    detected_from: input?.detected_from && typeof input.detected_from === 'object' && !Array.isArray(input.detected_from) ? input.detected_from : {},
    resolution_note: input?.resolution_note ? String(input.resolution_note) : null,
    resolved_at: input?.resolved_at ? String(input.resolved_at) : null,
    resolved_by: input?.resolved_by ? String(input.resolved_by) : null,
    created_at: String(input?.created_at || now),
    updated_at: String(input?.updated_at || now),
    employees: input?.employees,
  };
}

async function readFileStore() {
  try {
    const raw = await readFile(FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRow);
  } catch {
    return [];
  }
}

async function writeFileStore(rows: AttendanceExceptionRow[]) {
  await mkdir(FILE_DIR, { recursive: true });
  await writeFile(FILE_PATH, JSON.stringify(rows, null, 2), 'utf8');
}

function severityRank(severity: AttendanceExceptionSeverity) {
  if (severity === 'critical') return 4;
  if (severity === 'high') return 3;
  if (severity === 'medium') return 2;
  return 1;
}

export async function listAttendanceExceptions(options?: {
  status?: AttendanceExceptionStatus;
  severity?: AttendanceExceptionSeverity;
  exceptionType?: AttendanceExceptionType;
  employeeId?: string;
  date?: string;
  page?: number;
  pageSize?: number;
}) {
  const status = String(options?.status || '').trim().toLowerCase();
  const severity = String(options?.severity || '').trim().toLowerCase();
  const exceptionType = String(options?.exceptionType || '').trim().toLowerCase();
  const employeeId = String(options?.employeeId || '').trim();
  const date = normalizeDate(options?.date || '') || '';
  const page = Math.max(1, Number(options?.page || 1));
  const pageSize = Math.min(200, Math.max(1, Number(options?.pageSize || 50)));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin
    .from('attendance_exceptions')
    .select(
      'id, employee_id, date, exception_type, severity, status, title, description, detected_from, resolution_note, resolved_at, resolved_by, created_at, updated_at, employees(first_name,last_name,employee_code)',
      { count: 'exact' }
    )
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status && VALID_STATUSES.has(status as AttendanceExceptionStatus)) query = query.eq('status', status);
  if (severity && VALID_SEVERITIES.has(severity as AttendanceExceptionSeverity)) query = query.eq('severity', severity);
  if (exceptionType && VALID_TYPES.has(exceptionType as AttendanceExceptionType)) query = query.eq('exception_type', exceptionType);
  if (employeeId) query = query.eq('employee_id', employeeId);
  if (date) query = query.eq('date', date);

  const { data, error, count } = await query;

  if (!error) {
    return {
      data: (data || []).map(normalizeRow),
      meta: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.max(1, Math.ceil((count || 0) / pageSize)),
      },
    };
  }

  if (!isMissingTableError(error.message)) throw error;

  let rows = await readFileStore();
  if (status && VALID_STATUSES.has(status as AttendanceExceptionStatus)) rows = rows.filter((row) => row.status === status);
  if (severity && VALID_SEVERITIES.has(severity as AttendanceExceptionSeverity)) rows = rows.filter((row) => row.severity === severity);
  if (exceptionType && VALID_TYPES.has(exceptionType as AttendanceExceptionType)) rows = rows.filter((row) => row.exception_type === exceptionType);
  if (employeeId) rows = rows.filter((row) => row.employee_id === employeeId);
  if (date) rows = rows.filter((row) => row.date === date);

  rows.sort((a, b) => {
    if (a.date !== b.date) return String(b.date).localeCompare(String(a.date));
    if (a.status !== b.status) return String(a.status).localeCompare(String(b.status));
    return severityRank(b.severity) - severityRank(a.severity);
  });

  const total = rows.length;
  return {
    data: rows.slice(from, from + pageSize),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  };
}

function buildExceptionRows(input: {
  date: string;
  employees: Array<{ id: string; employee_code?: string }>;
  attendanceByEmployee: Map<string, string>;
  approvedLeaveEmployeeIds: Set<string>;
  pendingCorrectionEmployeeIds: Set<string>;
  absenceCountLast7Days: Map<string, number>;
}) {
  const rows: AttendanceExceptionRow[] = [];
  const now = new Date().toISOString();

  for (const employee of input.employees) {
    const employeeId = employee.id;
    const status = input.attendanceByEmployee.get(employeeId) || null;
    const onLeave = input.approvedLeaveEmployeeIds.has(employeeId);

    if (!status && !onLeave) {
      rows.push(
        normalizeRow({
          employee_id: employeeId,
          date: input.date,
          exception_type: 'missing_attendance',
          severity: 'high',
          status: 'open',
          title: 'Attendance not marked',
          description: 'No attendance status found for employee for this date.',
          detected_from: { rule: 'missing_attendance', date: input.date },
          created_at: now,
          updated_at: now,
        })
      );
    }

    if (status === 'absent' && !onLeave) {
      rows.push(
        normalizeRow({
          employee_id: employeeId,
          date: input.date,
          exception_type: 'unplanned_absence',
          severity: 'medium',
          status: 'open',
          title: 'Unplanned absence',
          description: 'Employee is absent without approved leave.',
          detected_from: { rule: 'unplanned_absence', date: input.date, attendance_status: status },
          created_at: now,
          updated_at: now,
        })
      );
    }

    if (input.pendingCorrectionEmployeeIds.has(employeeId)) {
      rows.push(
        normalizeRow({
          employee_id: employeeId,
          date: input.date,
          exception_type: 'pending_correction',
          severity: 'low',
          status: 'open',
          title: 'Pending attendance correction',
          description: 'Attendance correction request is pending review.',
          detected_from: { rule: 'pending_correction', date: input.date },
          created_at: now,
          updated_at: now,
        })
      );
    }

    const absenceCount = Number(input.absenceCountLast7Days.get(employeeId) || 0);
    if (absenceCount >= 3) {
      rows.push(
        normalizeRow({
          employee_id: employeeId,
          date: input.date,
          exception_type: 'repeated_absence',
          severity: 'high',
          status: 'open',
          title: 'Repeated absence trend',
          description: `Employee marked absent ${absenceCount} times in last 7 days.`,
          detected_from: { rule: 'repeated_absence', date: input.date, absent_count_last_7_days: absenceCount },
          created_at: now,
          updated_at: now,
        })
      );
    }
  }

  return rows;
}

export async function detectAttendanceExceptionsForDate(input?: { date?: string; detectedBy?: string }) {
  const date = normalizeDate(input?.date || '') || new Date().toISOString().slice(0, 10);
  const detectedBy = String(input?.detectedBy || '').trim() || null;

  const dateObj = new Date(`${date}T00:00:00.000Z`);
  const fromDateObj = new Date(dateObj);
  fromDateObj.setUTCDate(fromDateObj.getUTCDate() - 6);
  const fromDate = fromDateObj.toISOString().slice(0, 10);

  const [employeesRes, attendanceRes, leaveRes, correctionsRes, absent7Res] = await Promise.all([
    supabaseAdmin
      .from('employees')
      .select('id, employee_code, status, archived_at')
      .in('status', ['active', 'onboarding'])
      .is('archived_at', null),
    supabaseAdmin.from('attendance_records').select('employee_id, status').eq('date', date),
    supabaseAdmin.from('leave_requests').select('employee_id').eq('status', 'approved').lte('start_date', date).gte('end_date', date),
    supabaseAdmin.from('attendance_corrections').select('employee_id').eq('status', 'pending').eq('date', date),
    supabaseAdmin.from('attendance_records').select('employee_id, status').gte('date', fromDate).lte('date', date).eq('status', 'absent'),
  ]);

  if (employeesRes.error) throw employeesRes.error;
  if (attendanceRes.error) throw attendanceRes.error;
  if (leaveRes.error) throw leaveRes.error;
  if (correctionsRes.error && !String(correctionsRes.error.message || '').toLowerCase().includes('attendance_corrections')) {
    throw correctionsRes.error;
  }
  if (absent7Res.error) throw absent7Res.error;

  const employees = (employeesRes.data || []).map((row) => ({ id: String(row.id), employee_code: String(row.employee_code || '') }));
  const attendanceByEmployee = new Map<string, string>();
  for (const row of attendanceRes.data || []) attendanceByEmployee.set(String(row.employee_id), String(row.status || '').toLowerCase());

  const approvedLeaveEmployeeIds = new Set((leaveRes.data || []).map((row) => String(row.employee_id)));
  const pendingCorrectionEmployeeIds = new Set((correctionsRes.data || []).map((row) => String(row.employee_id)));

  const absenceCountLast7Days = new Map<string, number>();
  for (const row of absent7Res.data || []) {
    const employeeId = String(row.employee_id);
    absenceCountLast7Days.set(employeeId, Number(absenceCountLast7Days.get(employeeId) || 0) + 1);
  }

  const rows = buildExceptionRows({
    date,
    employees,
    attendanceByEmployee,
    approvedLeaveEmployeeIds,
    pendingCorrectionEmployeeIds,
    absenceCountLast7Days,
  });

  if (rows.length === 0) {
    return { date, detected: 0, rows: [] as AttendanceExceptionRow[] };
  }

  const upsertPayload = rows.map((row) => ({
    employee_id: row.employee_id,
    date: row.date,
    exception_type: row.exception_type,
    severity: row.severity,
    status: 'open',
    title: row.title,
    description: row.description,
    detected_from: {
      ...row.detected_from,
      detected_by: detectedBy,
      detected_at: new Date().toISOString(),
    },
    resolution_note: null,
    resolved_at: null,
    resolved_by: null,
    updated_at: new Date().toISOString(),
  }));

  const { data: savedRows, error: saveError } = await supabaseAdmin
    .from('attendance_exceptions')
    .upsert(upsertPayload, { onConflict: 'employee_id,date,exception_type' })
    .select(
      'id, employee_id, date, exception_type, severity, status, title, description, detected_from, resolution_note, resolved_at, resolved_by, created_at, updated_at, employees(first_name,last_name,employee_code)'
    );

  if (!saveError) {
    return {
      date,
      detected: savedRows?.length || 0,
      rows: (savedRows || []).map(normalizeRow),
    };
  }

  if (!isMissingTableError(saveError.message)) throw saveError;

  const store = await readFileStore();
  const map = new Map<string, AttendanceExceptionRow>();
  for (const row of store) {
    map.set(`${row.employee_id}:${row.date}:${row.exception_type}`, row);
  }

  for (const row of rows) {
    const key = `${row.employee_id}:${row.date}:${row.exception_type}`;
    const existing = map.get(key);
    map.set(
      key,
      normalizeRow({
        ...existing,
        ...row,
        id: existing?.id || row.id,
        status: 'open',
        resolution_note: null,
        resolved_at: null,
        resolved_by: null,
        updated_at: new Date().toISOString(),
        detected_from: {
          ...row.detected_from,
          detected_by: detectedBy,
          detected_at: new Date().toISOString(),
        },
      })
    );
  }

  const nextRows = Array.from(map.values());
  await writeFileStore(nextRows);

  return {
    date,
    detected: rows.length,
    rows,
  };
}

export async function updateAttendanceExceptionStatus(input: {
  id: string;
  status: AttendanceExceptionStatus;
  resolutionNote?: string | null;
  resolvedBy?: string | null;
}) {
  const id = String(input.id || '').trim();
  const status = String(input.status || '').trim().toLowerCase() as AttendanceExceptionStatus;
  const resolutionNote = input.resolutionNote ? String(input.resolutionNote).trim() : null;
  const resolvedBy = input.resolvedBy ? String(input.resolvedBy).trim() : null;

  if (!id) throw new Error('id is required');
  if (!VALID_STATUSES.has(status)) throw new Error('Invalid status');

  const isResolvedLike = status === 'resolved' || status === 'dismissed';
  const payload: Record<string, unknown> = {
    status,
    resolution_note: resolutionNote,
    resolved_by: isResolvedLike ? resolvedBy : null,
    resolved_at: isResolvedLike ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin
    .from('attendance_exceptions')
    .update(payload)
    .eq('id', id)
    .select(
      'id, employee_id, date, exception_type, severity, status, title, description, detected_from, resolution_note, resolved_at, resolved_by, created_at, updated_at, employees(first_name,last_name,employee_code)'
    )
    .maybeSingle();

  if (!error) {
    if (!data) throw new Error('Exception record not found');
    return normalizeRow(data);
  }

  if (!isMissingTableError(error.message)) throw error;

  const store = await readFileStore();
  const index = store.findIndex((row) => row.id === id);
  if (index < 0) throw new Error('Exception record not found');

  store[index] = normalizeRow({ ...store[index], ...payload });
  await writeFileStore(store);
  return store[index];
}

export async function getAttendanceExceptionSummary(options?: { status?: AttendanceExceptionStatus; date?: string }) {
  const listing = await listAttendanceExceptions({
    status: options?.status,
    date: options?.date,
    page: 1,
    pageSize: 1000,
  });

  const bySeverity: Record<AttendanceExceptionSeverity, number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  const byType: Record<AttendanceExceptionType, number> = {
    missing_attendance: 0,
    unplanned_absence: 0,
    pending_correction: 0,
    repeated_absence: 0,
  };

  for (const row of listing.data) {
    bySeverity[row.severity] += 1;
    byType[row.exception_type] += 1;
  }

  return {
    total: listing.meta.total,
    bySeverity,
    byType,
  };
}
