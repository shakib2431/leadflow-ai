import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { requireRole } from '@/lib/hrms/apiAuth';
import { enforceEmployeeScope } from '@/lib/hrms/employeeScope';

function deriveStoragePath(documentRow: { storage_path?: string | null; file_path?: string | null }, employeeId: string, documentId: string) {
  if (documentRow.storage_path?.trim()) return documentRow.storage_path.trim();

  if (documentRow.file_path) {
    const marker = '/storage/v1/object/public/hr-docs/';
    const idx = documentRow.file_path.indexOf(marker);
    if (idx >= 0) {
      return documentRow.file_path.slice(idx + marker.length);
    }
  }

  return `${employeeId}/${documentId}`;
}

export async function GET(req: Request, context: { params: Promise<{ id: string; documentId: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const { id, documentId } = await context.params;
  const scopeError = await enforceEmployeeScope(auth as any, id);
  if (scopeError) return scopeError;

  const { data: documentRow, error: docError } = await supabaseAdmin
    .from('employee_documents')
    .select('id,file_name,file_path,storage_path')
    .eq('employee_id', id)
    .eq('id', documentId)
    .maybeSingle();

  if (docError || !documentRow) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const storagePath = deriveStoragePath(documentRow, id, documentId);
  const { data, error } = await supabaseAdmin.storage.from('hr-docs').download(storagePath);

  if (error || !data) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  return new NextResponse(data, {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${documentRow.file_name}"`,
    },
  });
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string; documentId: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  const { id, documentId } = await context.params;
  const { data: documentRow, error: docError } = await supabaseAdmin
    .from('employee_documents')
    .select('id,file_name,file_path,storage_path')
    .eq('employee_id', id)
    .eq('id', documentId)
    .maybeSingle();

  if (docError) {
    return NextResponse.json({ error: docError.message }, { status: 500 });
  }

  if (!documentRow) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const storagePath = deriveStoragePath(documentRow, id, documentId);
  const { error: removeError } = await supabaseAdmin.storage.from('hr-docs').remove([storagePath]);
  if (removeError) {
    return NextResponse.json({ error: removeError.message }, { status: 500 });
  }

  const { error: deleteError } = await supabaseAdmin
    .from('employee_documents')
    .delete()
    .eq('id', documentId)
    .eq('employee_id', id);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}