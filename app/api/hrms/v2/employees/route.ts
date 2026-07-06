import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/hrms/apiAuth';
import { validateEmployeePayload } from '@/lib/hrms/employeeValidation';
import { upsertEmployeeTaxDeclaration } from '@/lib/hrms/taxDeclarations';
import { ensureCompensationAutomation } from '@/lib/hrms/compensationAutomation';
import { buildOnboardingChecklistState } from '@/lib/hrms/onboardingChecklist';

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

async function validateEmployeeForeignKeys(payload: Record<string, any>) {
  const invalid: string[] = [];

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

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim();
  const status = (url.searchParams.get('status') || '').trim();
  const businessEntityId = (url.searchParams.get('business_entity_id') || '').trim();
  const departmentId = (url.searchParams.get('department_id') || '').trim();
  const designationId = (url.searchParams.get('designation_id') || '').trim();
  const reportingManagerId = (url.searchParams.get('reporting_manager_id') || '').trim();
  const includeArchived = url.searchParams.get('includeArchived') === 'true';
  const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get('pageSize') || '10')));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabaseAdmin.from('employees').select('*', { count: 'exact' }).order('first_name').range(from, to);
  if (q) query = query.or(`first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,employee_code.ilike.%${q}%`);
  if (status) query = query.eq('status', status);
  if (businessEntityId) query = query.eq('business_entity_id', businessEntityId);
  if (departmentId) query = query.eq('department_id', departmentId);
  if (designationId) query = query.eq('designation_id', designationId);
  if (reportingManagerId) query = query.eq('reporting_manager_id', reportingManagerId);
  if (!includeArchived && status !== 'archived') query = query.is('archived_at', null);

  const { data, error, count } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const total = count || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return NextResponse.json({ data, meta: { page, pageSize, total, totalPages } });
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    // Merge any parsed/mapped fields if provided by the client
    if (body.mapped && typeof body.mapped === 'object') {
      Object.assign(body, body.mapped);
      delete body.mapped;
    }

    // Generate employee_code if missing
    if (!body.employee_code) {
      const suffix = Date.now().toString().slice(-6);
      body.employee_code = `EMP-${suffix}`;
    }

    // Minimal server-side validation: require first_name, last_name, email, phone
    if (body.first_name) body.first_name = String(body.first_name).trim();
    if (body.last_name) body.last_name = String(body.last_name).trim();
    if (body.email) body.email = String(body.email).trim().toLowerCase();
    if (body.phone) body.phone = String(body.phone).trim();
    if (!body.phone && body.mobile) body.phone = String(body.mobile).trim();

    const missing: string[] = [];
    if (!body.first_name) missing.push('first_name');
    if (!body.last_name) missing.push('last_name');
    if (!body.email) missing.push('email');
    if (!body.phone) missing.push('phone');
    if (missing.length > 0) {
      return NextResponse.json({ error: 'Missing required fields', missing }, { status: 422 });
    }

    if (!body.status) body.status = 'onboarding';
    if (!body.employment_status) body.employment_status = body.status;
    if (!body.mobile) body.mobile = body.phone;
    if (!body.onboarding_checklist) body.onboarding_checklist = buildOnboardingChecklistState(body.status);

    const validation = validateEmployeePayload(body);
    if (!validation.valid) {
      return NextResponse.json({ error: 'Validation failed', details: validation.errors }, { status: 422 });
    }

    // Preserve strict relationships from master tables where provided
    if (body.business_entity_id) body.business_entity_id = String(body.business_entity_id);
    if (body.department_id) body.department_id = String(body.department_id);
    if (body.designation_id) body.designation_id = String(body.designation_id);
    if (body.reporting_manager && !body.reporting_manager_id) {
      body.reporting_manager_id = String(body.reporting_manager);
    }
    if (body.reporting_manager_id) body.reporting_manager_id = String(body.reporting_manager_id);
    delete body.reporting_manager;

    const relationValidation = await validateEmployeeForeignKeys(body);
    if (!relationValidation.ok) {
      return NextResponse.json(
        { error: relationValidation.error, details: (relationValidation as any).details },
        { status: relationValidation.status }
      );
    }

    const { data, error } = await supabaseAdmin.from('employees').insert([body]).select('*');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const created = data?.[0];
    let warning: string | null = null;

    if (created?.id) {
      await upsertEmployeeTaxDeclaration({
        employee_id: String(created.id),
        regime: 'NEW',
        declared_80c: 0,
        declared_80d: 0,
      });

      const automation = await ensureCompensationAutomation(String(created.id), created.salary);
      if (!automation.ok) {
        warning = `Employee created but salary automation failed: ${automation.error}`;
      }
    }

    return NextResponse.json({ data, warning }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}
