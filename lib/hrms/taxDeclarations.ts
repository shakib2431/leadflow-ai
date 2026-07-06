import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { supabaseAdmin } from '@/lib/supabase-admin';

export type EmployeeTaxRegime = 'OLD' | 'NEW';

export type EmployeeTaxDeclaration = {
  employee_id: string;
  regime: EmployeeTaxRegime;
  declared_80c: number;
  declared_80d: number;
  updated_at: string;
};

const FILE_DIR = path.join(process.cwd(), 'tmp');
const FILE_PATH = path.join(FILE_DIR, 'tax-declarations.json');

function isMissingTableError(message: string) {
  const text = String(message || '').toLowerCase();
  const relationMissing = text.includes('relation') && text.includes('does not exist') && text.includes('hr_tax_declarations');
  const schemaCacheMissing = text.includes('could not find the table') && text.includes('hr_tax_declarations');
  return relationMissing || schemaCacheMissing;
}

function sanitizeRegime(value: unknown): EmployeeTaxRegime {
  return String(value || '').toUpperCase() === 'OLD' ? 'OLD' : 'NEW';
}

function sanitizeAmount(value: unknown, max: number) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return 0;
  return Math.min(Math.round(num), max);
}

function normalizeRecord(input: any): EmployeeTaxDeclaration {
  return {
    employee_id: String(input?.employee_id || '').trim(),
    regime: sanitizeRegime(input?.regime),
    declared_80c: sanitizeAmount(input?.declared_80c, 150000),
    declared_80d: sanitizeAmount(input?.declared_80d, 100000),
    updated_at: String(input?.updated_at || new Date().toISOString()),
  };
}

async function readFileStore(): Promise<EmployeeTaxDeclaration[]> {
  try {
    const raw = await readFile(FILE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRecord).filter((row) => row.employee_id);
  } catch {
    return [];
  }
}

async function writeFileStore(records: EmployeeTaxDeclaration[]) {
  await mkdir(FILE_DIR, { recursive: true });
  await writeFile(FILE_PATH, JSON.stringify(records, null, 2), 'utf8');
}

export async function getTaxDeclarationsMap(employeeIds: string[]) {
  const cleanIds = Array.from(new Set(employeeIds.map((id) => String(id || '').trim()).filter(Boolean)));
  const map = new Map<string, EmployeeTaxDeclaration>();

  if (cleanIds.length === 0) return map;

  const { data, error } = await supabaseAdmin
    .from('hr_tax_declarations')
    .select('employee_id, regime, declared_80c, declared_80d, updated_at')
    .in('employee_id', cleanIds);

  if (error) {
    if (!isMissingTableError(error.message)) throw error;

    const fallbackRows = await readFileStore();
    for (const row of fallbackRows) {
      if (cleanIds.includes(row.employee_id)) map.set(row.employee_id, row);
    }
    return map;
  }

  for (const row of data || []) {
    const normalized = normalizeRecord(row);
    if (normalized.employee_id) map.set(normalized.employee_id, normalized);
  }

  return map;
}

export async function getEmployeeTaxDeclaration(employeeId: string) {
  const map = await getTaxDeclarationsMap([employeeId]);
  return (
    map.get(employeeId) || {
      employee_id: employeeId,
      regime: 'NEW',
      declared_80c: 0,
      declared_80d: 0,
      updated_at: new Date().toISOString(),
    }
  );
}

export async function upsertEmployeeTaxDeclaration(input: {
  employee_id: string;
  regime: EmployeeTaxRegime;
  declared_80c: number;
  declared_80d: number;
}) {
  const record = normalizeRecord({
    employee_id: input.employee_id,
    regime: input.regime,
    declared_80c: input.declared_80c,
    declared_80d: input.declared_80d,
    updated_at: new Date().toISOString(),
  });

  const { error } = await supabaseAdmin.from('hr_tax_declarations').upsert(record, { onConflict: 'employee_id' });

  if (!error) return record;
  if (!isMissingTableError(error.message)) throw error;

  const rows = await readFileStore();
  const nextRows = rows.filter((row) => row.employee_id !== record.employee_id);
  nextRows.push(record);
  await writeFileStore(nextRows);
  return record;
}
