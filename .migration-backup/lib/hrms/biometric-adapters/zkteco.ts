type RawRecord = Record<string, unknown>;

export type ZktecoMappedRow = {
  employee_id?: string;
  employee_code?: string;
  date?: string;
  status?: 'present' | 'absent' | 'half_day';
};

function normalizeDate(input: unknown) {
  const raw = String(input || '').trim();
  if (!raw) return null;

  const datePart = raw.includes('T') ? raw.split('T')[0] : raw.split(' ')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeStatus(input: unknown) {
  const raw = String(input || '').trim().toLowerCase();
  if (!raw) return null;

  if (raw === 'present' || raw === 'p' || raw === '1' || raw === 'in') return 'present';
  if (raw === 'absent' || raw === 'a' || raw === '0' || raw === 'out') return 'absent';
  if (raw === 'half_day' || raw === 'half-day' || raw === 'half day' || raw === 'h') return 'half_day';
  return null;
}

export function mapZktecoPayload(payload: any, fallbackDate: string) {
  const records = Array.isArray(payload?.records)
    ? payload.records
    : Array.isArray(payload?.entries)
    ? payload.entries
    : [];

  const mapped: ZktecoMappedRow[] = [];
  const errors: Array<Record<string, unknown>> = [];

  records.forEach((item: RawRecord, index: number) => {
    const employeeId = String(item.employee_id || item.employeeId || '').trim();
    const employeeCode = String(item.employee_code || item.emp_code || item.empCode || item.employeeNo || '').trim();
    const date =
      normalizeDate(item.date || item.attendance_date || item.punchDate || item.punch_time || item.timestamp) || fallbackDate;
    const status = normalizeStatus(item.status || item.attendance_status || item.punch_status || item.punchState || 'present');

    if (!status) {
      errors.push({ row: index + 1, reason: 'Invalid status', value: item.status || item.attendance_status || null });
      return;
    }

    if (!employeeId && !employeeCode) {
      errors.push({ row: index + 1, reason: 'Missing employee identifier' });
      return;
    }

    mapped.push({
      employee_id: employeeId || undefined,
      employee_code: employeeCode || undefined,
      date,
      status,
    });
  });

  return {
    rows: mapped,
    errors,
    audit: {
      adapter: 'zkteco',
      total_rows: records.length,
      accepted_rows: mapped.length,
      rejected_rows: errors.length,
      device_serial: payload?.device_serial || payload?.deviceSerial || null,
      event_id: payload?.event_id || payload?.eventId || null,
    },
  };
}
