import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

// 1. Type params as a Promise
export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string; fileName: string }> }
) {
  const { employeeId, fileName } = await params;

  const { data: documentRow, error: docError } = await supabaseAdmin
    .from('employee_documents')
    .select('file_name,file_path,storage_path')
    .eq('employee_id', employeeId)
    .or(`storage_path.eq.${employeeId}/${fileName},storage_path.eq.${fileName},file_name.eq.${fileName},file_path.ilike.%${fileName}%`)
    .maybeSingle();

  if (docError || !documentRow) {
    return new NextResponse('Document not found', { status: 404 });
  }

  let storagePath = documentRow.storage_path?.trim() || '';

  if (!storagePath && documentRow.file_path) {
    const marker = '/storage/v1/object/public/hr-docs/';
    const idx = documentRow.file_path.indexOf(marker);
    if (idx >= 0) {
      storagePath = documentRow.file_path.slice(idx + marker.length);
    }
  }

  if (!storagePath) {
    storagePath = `${employeeId}/${fileName}`;
  }

  const { data, error } = await supabaseAdmin.storage
    .from('hr-docs')
    .download(storagePath);

  if (error || !data) {
    return new NextResponse('Document not found', { status: 404 });
  }

  return new NextResponse(data, {
    headers: {
      'Content-Type': data.type || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${documentRow.file_name || fileName}"`,
    },
  });
}