import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/hrms/apiAuth';
import { validateEmployeePayload } from '@/lib/hrms/employeeValidation';
import { enforceEmployeeScope } from '@/lib/hrms/employeeScope';
import { upsertEmployeeTaxDeclaration } from '@/lib/hrms/taxDeclarations';
import { ensureCompensationAutomation } from '@/lib/hrms/compensationAutomation';
import { encryptSensitiveField, decryptSensitiveField } from '@/lib/hrms/data-integrity';

type RelationCheck = {
  field: 'business_entity_id' | 'department_id' | 'designation_id' | 'reporting_manager_id';
  table: 'business_entities' | 'departments' | 'designations' | 'employees';
};

const RELATION_CHECKS: RelationCheck[] = [
  { field: 'business_entity_id', table: 'business_entities' },
  { field: 'department_id', table: 'departments' },
  { field: 'designation_id', table: 'designations' },
  { field: 'reporting_manager_id', table: 'employees' },
];

function normalizeNullableRelationFields(payload: Record<string, any>) {
  for (const check of RELATION_CHECKS) {
    if (payload[check.field] === '') payload[check.field] = null;
  }
}

function normalizeNullableDateFields(payload: Record<string, any>) {
  for (const field of ['date_of_birth', 'joining_date', 'date_of_joining']) {
    if (payload[field] === '') payload[field] = null;
  }
}

async function validateEmployeeForeignKeys(payload: Record<string, any>, employeeId: string) {
  const invalid: string[] = [];

  if (payload.reporting_manager_id && String(payload.reporting_manager_id) === employeeId) {
    return { ok: false as const, status: 422, error: 'reporting_manager_id cannot reference the employee itself' };
  }

  for (const check of RELATION_CHECKS) {
    if (!payload[check.field]) continue;
    const value = String(payload[check.field]).trim();
    payload[check.field] = value;

    const { data, error } = await supabaseAdmin
      .from(check.table)
      .select('id')
      .eq('id', value)
      .maybeSingle();

    if (error) {
      return { ok: false as const, status: 500, error: error.message };
    }

    if (!data) invalid.push(check.field);
  }

  if (invalid.length > 0) {
    return {
      ok: false as const,
      status: 422,
      error: 'Invalid foreign key references',
      details: invalid,
    };
  }

  return { ok: true as const };
}

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = await req.json();

    normalizeNullableRelationFields(body);
    normalizeNullableDateFields(body);

    if (body.reporting_manager && !body.reporting_manager_id) {
      body.reporting_manager_id = String(body.reporting_manager);
    }
    if (body.reporting_manager_id) {
      body.reporting_manager_id = String(body.reporting_manager_id);
    }
    delete body.reporting_manager;

    const relationValidation = await validateEmployeeForeignKeys(body, id);
    if (!relationValidation.ok) {
      return NextResponse.json(
        { error: relationValidation.error, details: (relationValidation as any).details },
        { status: relationValidation.status }
      );
    }

    const validation = validateEmployeePayload(body);
    if (!validation.valid) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 422 });
    }

    const taxRegimeRaw = body.tax_regime;
    const tax80cRaw = body.declared_80c;
    const tax80dRaw = body.declared_80d;
    const salaryRaw = body.salary;

    if ('tax_regime' in body) delete body.tax_regime;
    if ('declared_80c' in body) delete body.declared_80c;
    if ('declared_80d' in body) delete body.declared_80d;

    // Encrypt sensitive fields before storage
    const sensitiveFields = ['pan', 'aadhaar', 'bank_account_number', 'ifsc_code'];
    for (const field of sensitiveFields) {
      if (body[field]) {
        body[field] = encryptSensitiveField(body[field]);
      }
    }

    const { data, error } = await supabaseAdmin.from('employees').update(body).eq('id', id).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    let warning: string | null = null;

    if (taxRegimeRaw !== undefined || tax80cRaw !== undefined || tax80dRaw !== undefined) {
      await upsertEmployeeTaxDeclaration({
        employee_id: id,
        regime: String(taxRegimeRaw || 'NEW').toUpperCase() === 'OLD' ? 'OLD' : 'NEW',
        declared_80c: Math.max(0, Math.min(150000, Number(tax80cRaw || 0))),
        declared_80d: Math.max(0, Math.min(100000, Number(tax80dRaw || 0))),
      });
    }

    if (salaryRaw !== undefined) {
      const automation = await ensureCompensationAutomation(id, salaryRaw);
      if (!automation.ok) {
        warning = `Employee updated but salary automation failed: ${automation.error}`;
      }
    }

    return NextResponse.json({ data, warning });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const scopeError = await enforceEmployeeScope(auth as any, id);
  if (scopeError) return scopeError;

  const { data, error } = await supabaseAdmin.from('employees').select('*').eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Decrypt sensitive fields
  if (data) {
    const sensitiveFields = ['pan', 'aadhaar', 'bank_account_number', 'ifsc_code'];
    for (const field of sensitiveFields) {
      if (data[field]) {
        try {
          data[field] = decryptSensitiveField(data[field]);
        } catch (err) {
          console.error(`Failed to decrypt field ${field}`);
          // Keep encrypted value if decryption fails
        }
      }
    }
  }

  return NextResponse.json({ data });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  const hardDelete = new URL(req.url).searchParams.get('hard') === 'true';
  const { id } = await context.params;

  if (hardDelete) {
    const { error } = await supabaseAdmin.from('employees').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, mode: 'hard-delete' });
  }

  const { error } = await supabaseAdmin
    .from('employees')
    .update({
      archived_at: new Date().toISOString(),
      archived_by: auth.userId,
      employment_status: 'archived',
      status: 'archived',
    })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, mode: 'archive' });
}
