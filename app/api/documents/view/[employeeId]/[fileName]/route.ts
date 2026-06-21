import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Ensure this path is correct for your project

// 1. Type params as a Promise
export async function GET(
  request: Request,
  { params }: { params: Promise<{ employeeId: string; fileName: string }> }
) {
  // 2. Await the params before using them
  const { employeeId, fileName } = await params;

  const { data, error } = await supabase.storage
    .from('hr-docs')
    .download(`${employeeId}/${fileName}`);

  if (error || !data) {
    return new NextResponse("Document not found", { status: 404 });
  }

  return new NextResponse(data, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
    },
  });
}