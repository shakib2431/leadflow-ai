import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/hrms/apiAuth';
import { enforceEmployeeScope } from '@/lib/hrms/employeeScope';

function normalizeStoragePath(filePath: string | null | undefined) {
  if (!filePath) return '';

  const marker = '/storage/v1/object/public/hr-docs/';
  const idx = filePath.indexOf(marker);
  return idx >= 0 ? filePath.slice(idx + marker.length) : filePath;
}

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const scopeError = await enforceEmployeeScope(auth as any, id);
  if (scopeError) return scopeError;

  const { data, error } = await supabaseAdmin
    .from('employee_documents')
    .select('id,file_name,file_path,storage_path,created_at')
    .eq('employee_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [] });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const formData = await req.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'File is required' }, { status: 422 });
    }

    const safeName = sanitizeFileName(file.name || 'document');
    const storagePath = `${id}/${Date.now()}-${safeName}`;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from('hr-docs')
      .upload(storagePath, buffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const secureViewPath = `/api/hrms/v2/employees/${id}/documents/${storagePath.split('/').pop()}`;
    const { data, error: insertError } = await supabaseAdmin
      .from('employee_documents')
      .insert([{
        employee_id: id,
        file_name: file.name,
        file_path: secureViewPath,
        storage_path: storagePath,
      }])
      .select('id,file_name,file_path,storage_path,created_at')
      .single();

    if (insertError) {
      await supabaseAdmin.storage.from('hr-docs').remove([storagePath]);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to upload document' }, { status: 400 });
  }
}