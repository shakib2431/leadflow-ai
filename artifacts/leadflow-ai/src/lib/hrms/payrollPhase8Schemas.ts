import { SalaryComponent } from '@/lib/compliance/validateWageFloor';

const VALID_COMPONENT_TYPE = new Set(['wages', 'allowance', 'other_remuneration']);

export function normalizeDate(input?: string | null) {
  const value = String(input || '').trim();
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

export function validateCtcAnnual(value: unknown) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, error: 'ctc_annual must be a positive number' };
  }
  if (amount > 100000000) {
    return { ok: false as const, error: 'ctc_annual is unrealistically high' };
  }
  return { ok: true as const, value: Math.round(amount) };
}

export function sanitizeComponents(input: any): SalaryComponent[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((row) => ({
      component_name: String(row?.component_name || '').trim(),
      component_type: String(row?.component_type || '').trim().toLowerCase(),
      amount_monthly: Number(row?.amount_monthly || 0),
    }))
    .filter(
      (row) =>
        row.component_name &&
        VALID_COMPONENT_TYPE.has(row.component_type) &&
        Number.isFinite(row.amount_monthly) &&
        row.amount_monthly >= 0
    ) as SalaryComponent[];
}

export function validateComponents(components: SalaryComponent[]) {
  if (!Array.isArray(components) || components.length === 0) {
    return { ok: false as const, error: 'At least one valid salary component is required' };
  }

  if (components.length > 25) {
    return { ok: false as const, error: 'Too many salary components. Max allowed is 25' };
  }

  const seen = new Set<string>();
  for (const row of components) {
    const key = `${row.component_name.toLowerCase()}::${row.component_type}`;
    if (seen.has(key)) {
      return { ok: false as const, error: `Duplicate component: ${row.component_name}` };
    }
    seen.add(key);

    if (row.amount_monthly > 10000000) {
      return { ok: false as const, error: `Component amount too high: ${row.component_name}` };
    }
  }

  const monthlyTotal = components.reduce((sum, row) => sum + Number(row.amount_monthly || 0), 0);
  if (monthlyTotal <= 0) {
    return { ok: false as const, error: 'Total monthly component amount must be greater than zero' };
  }

  return { ok: true as const, monthlyTotal };
}

export function parseMonthYear(monthInput: string | null, yearInput: string | null) {
  const month = Number(monthInput);
  const year = Number(yearInput);
  const validMonth = Number.isFinite(month) && month >= 1 && month <= 12 ? Math.floor(month) : null;
  const validYear = Number.isFinite(year) && year >= 2000 && year <= 2100 ? Math.floor(year) : null;
  return { month: validMonth, year: validYear };
}
