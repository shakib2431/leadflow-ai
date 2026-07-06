import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/hrms/apiAuth';
import { buildLetterTokens, renderTemplate } from '@/lib/hrms/letters';

async function fetchEmployeeContext(id: string) {
  const { data: employee, error: employeeError } = await supabaseAdmin
    .from('employees')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (employeeError) throw new Error(employeeError.message);
  if (!employee) return null;

  const [departmentRes, designationRes] = await Promise.all([
    employee.department_id
      ? supabaseAdmin.from('departments').select('name').eq('id', employee.department_id).maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
    employee.designation_id
      ? supabaseAdmin.from('designations').select('name').eq('id', employee.designation_id).maybeSingle()
      : Promise.resolve({ data: null, error: null } as any),
  ]);

  if (departmentRes.error) throw new Error(departmentRes.error.message);
  if (designationRes.error) throw new Error(designationRes.error.message);

  return {
    employee,
    departmentName: departmentRes.data?.name || employee.department || 'Unassigned',
    designationName: designationRes.data?.name || employee.designation || employee.current_title || 'Unassigned',
  };
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const employeeId = String(body.employee_id || '').trim();
    if (!employeeId) {
      return NextResponse.json({ error: 'employee_id is required' }, { status: 422 });
    }

    let subjectTemplate = String(body.subject_template || '');
    let bodyTemplate = String(body.body_template || '');

    if (body.template_id) {
      const { data: template, error: templateError } = await supabaseAdmin
        .from('hr_letter_templates')
        .select('subject_template, body_template')
        .eq('id', String(body.template_id))
        .maybeSingle();

      if (templateError) return NextResponse.json({ error: templateError.message }, { status: 500 });
      if (!template) return NextResponse.json({ error: 'Template not found' }, { status: 404 });

      subjectTemplate = template.subject_template;
      bodyTemplate = template.body_template;
    }

    if (!subjectTemplate || !bodyTemplate) {
      return NextResponse.json({ error: 'subject_template and body_template are required' }, { status: 422 });
    }

    const employeeContext = await fetchEmployeeContext(employeeId);
    if (!employeeContext) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const tokens = buildLetterTokens(employeeContext);
    const previewSubject = renderTemplate(subjectTemplate, tokens);
    const previewBody = renderTemplate(bodyTemplate, tokens);

    return NextResponse.json({
      data: {
        subject: previewSubject,
        body: previewBody,
        tokens,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to preview template' }, { status: 400 });
  }
}