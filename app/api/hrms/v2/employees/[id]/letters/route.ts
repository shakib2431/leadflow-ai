import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/hrms/apiAuth';
import { enforceEmployeeScope } from '@/lib/hrms/employeeScope';
import {
  buildLetterTokens,
  formatDate,
  generateLetterPdf,
  renderTemplate,
  sanitizeFileName,
} from '@/lib/hrms/letters';

async function fetchEmployeeWithLookup(id: string) {
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

async function resolveTemplate(body: any) {
  if (body.template_id) {
    const { data, error } = await supabaseAdmin
      .from('hr_letter_templates')
      .select('*')
      .eq('id', String(body.template_id))
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }

  const key = String(body.template_key || '').trim() || 'appointment_letter';
  const { data, error } = await supabaseAdmin
    .from('hr_letter_templates')
    .select('*')
    .eq('template_key', key)
    .eq('is_active', true)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const scopeError = await enforceEmployeeScope(auth as any, id);
  if (scopeError) return scopeError;

  const { data, error } = await supabaseAdmin
    .from('employee_letters')
    .select('id,employee_id,template_key,template_version,letter_type,file_name,created_at,regenerated_from')
    .eq('employee_id', id)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data || [] });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = await req.json();

    const employeeContext = await fetchEmployeeWithLookup(id);
    if (!employeeContext) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const template = await resolveTemplate(body);
    if (!template) {
      return NextResponse.json({ error: 'No active template found for requested key' }, { status: 404 });
    }

    const tokens = buildLetterTokens(employeeContext);
    const renderedSubject = renderTemplate(template.subject_template, tokens);
    const renderedBody = renderTemplate(template.body_template, tokens);
    const title = `${template.letter_type.toUpperCase()} LETTER`;
    const pdfBuffer = generateLetterPdf({ title, subject: renderedSubject, body: renderedBody });

    const rawFileName = `${template.letter_type}-${tokens.employee_name || id}-${formatDate(new Date().toISOString())}.pdf`;
    const fileName = sanitizeFileName(rawFileName);
    const storagePath = `${id}/letters/${Date.now()}-${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('hr-docs')
      .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: letterRow, error: letterError } = await supabaseAdmin
      .from('employee_letters')
      .insert([{
        employee_id: id,
        template_id: template.id,
        template_key: template.template_key,
        template_version: template.version,
        letter_type: template.letter_type,
        file_name: fileName,
        storage_path: storagePath,
        rendered_subject: renderedSubject,
        rendered_body: renderedBody,
        merge_payload: tokens,
        created_by: auth.userId,
      }])
      .select('*')
      .single();

    if (letterError || !letterRow) {
      await supabaseAdmin.storage.from('hr-docs').remove([storagePath]);
      return NextResponse.json({ error: letterError?.message || 'Failed to save generated letter' }, { status: 500 });
    }

    const { data: docRow, error: docError } = await supabaseAdmin
      .from('employee_documents')
      .insert([{
        employee_id: id,
        file_name: fileName,
        file_path: `/api/hrms/v2/employees/${id}/letters/${letterRow.id}/download`,
        storage_path: storagePath,
      }])
      .select('id')
      .single();

    if (docError) {
      return NextResponse.json({ error: docError.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        ...letterRow,
        employee_document_id: docRow?.id,
        download_url: `/api/hrms/v2/employees/${id}/letters/${letterRow.id}/download`,
      },
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate letter' }, { status: 400 });
  }
}