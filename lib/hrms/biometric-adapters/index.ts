import { mapZktecoPayload } from './zkteco';

export type BiometricMappedRow = {
  employee_id?: string;
  employee_code?: string;
  date?: string;
  status?: 'present' | 'absent' | 'half_day';
};

function normalizeDate(input: unknown) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeStatus(input: unknown) {
  const raw = String(input || '').trim().toLowerCase();
  if (raw === 'present' || raw === 'absent' || raw === 'half_day') return raw as 'present' | 'absent' | 'half_day';
  return null;
}

function mapGenericPayload(payload: any, fallbackDate: string) {
  const entries = Array.isArray(payload?.entries) ? payload.entries : [];
  const rows: BiometricMappedRow[] = [];
  const errors: Array<Record<string, unknown>> = [];

  entries.forEach((entry: any, index: number) => {
    const employeeId = String(entry?.employee_id || '').trim();
    const employeeCode = String(entry?.employee_code || '').trim();
    const date = normalizeDate(entry?.date) || fallbackDate;
    const status = normalizeStatus(entry?.status);

    if (!status) {
      errors.push({ row: index + 1, reason: 'Invalid status' });
      return;
    }

    if (!employeeId && !employeeCode) {
      errors.push({ row: index + 1, reason: 'Missing employee identifier' });
      return;
    }

    rows.push({ employee_id: employeeId || undefined, employee_code: employeeCode || undefined, date, status });
  });

  return {
    rows,
    errors,
    audit: {
      adapter: 'generic',
      total_rows: entries.length,
      accepted_rows: rows.length,
      rejected_rows: errors.length,
      event_id: payload?.event_id || null,
    },
  };
}

export function mapBiometricPayload(vendor: string, payload: any, fallbackDate: string) {
  const key = String(vendor || '').trim().toLowerCase();
  if (key === 'zkteco') return mapZktecoPayload(payload, fallbackDate);
  return mapGenericPayload(payload, fallbackDate);
}
