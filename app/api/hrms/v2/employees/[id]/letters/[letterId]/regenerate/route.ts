import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/hrms/apiAuth';
import { formatDate, generateLetterPdf, renderTemplate, sanitizeFileName } from '@/lib/hrms/letters';

export async function POST(req: Request, context: { params: Promise<{ id: string; letterId: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const { id, letterId } = await context.params;
    const { data: existing, error: existingError } = await supabaseAdmin
      .from('employee_letters')
      .select('*')
      .eq('id', letterId)
      .eq('employee_id', id)
      .maybeSingle();

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Source letter not found' }, { status: 404 });
    }

    let renderedSubject = existing.rendered_subject;
    let renderedBody = existing.rendered_body;

    if (existing.template_id) {
      const { data: template } = await supabaseAdmin
        .from('hr_letter_templates')
        .select('*')
        .eq('id', existing.template_id)
        .maybeSingle();

      if (template) {
        renderedSubject = renderTemplate(template.subject_template, existing.merge_payload || {});
        renderedBody = renderTemplate(template.body_template, existing.merge_payload || {});
      }
    }

    const title = `${String(existing.letter_type || 'LETTER').toUpperCase()} LETTER`;
    const pdfBuffer = generateLetterPdf({ title, subject: renderedSubject, body: renderedBody });

    const baseName = existing.file_name?.replace(/\.pdf$/i, '') || `letter-${existing.letter_type}`;
    const fileName = sanitizeFileName(`${baseName}-regen-${formatDate(new Date().toISOString())}.pdf`);
    const storagePath = `${id}/letters/${Date.now()}-${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from('hr-docs')
      .upload(storagePath, pdfBuffer, { contentType: 'application/pdf', upsert: false });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: regenerated, error: insertError } = await supabaseAdmin
      .from('employee_letters')
      .insert([{
        employee_id: id,
        template_id: existing.template_id,
        template_key: existing.template_key,
        template_version: existing.template_version,
        letter_type: existing.letter_type,
        file_name: fileName,
        storage_path: storagePath,
        rendered_subject: renderedSubject,
        rendered_body: renderedBody,
        merge_payload: existing.merge_payload || {},
        regenerated_from: existing.id,
        created_by: auth.userId,
      }])
      .select('*')
      .single();

    if (insertError || !regenerated) {
      return NextResponse.json({ error: insertError?.message || 'Failed to save regenerated letter' }, { status: 500 });
    }

    await supabaseAdmin.from('employee_documents').insert([{
      employee_id: id,
      file_name: fileName,
      file_path: `/api/hrms/v2/employees/${id}/letters/${regenerated.id}/download`,
      storage_path: storagePath,
    }]);

    return NextResponse.json({
      data: {
        ...regenerated,
        download_url: `/api/hrms/v2/employees/${id}/letters/${regenerated.id}/download`,
      },
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to regenerate letter' }, { status: 400 });
  }
}