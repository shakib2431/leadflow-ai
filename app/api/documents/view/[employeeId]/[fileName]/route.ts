import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Ensure this points to your client

export async function GET(
  request: Request,
  { params }: { params: { employeeId: string; fileName: string } }
) {
  const { employeeId, fileName } = params;

  // Fetch the file from Supabase Storage
  // Path structure: employee_id/file_name
  const { data, error } = await supabase.storage
    .from('hr-docs') // Ensure this bucket exists in Supabase
    .download(`${employeeId}/${fileName}`);

  if (error || !data) {
    return new NextResponse("Document not found", { status: 404 });
  }

  // Convert the Blob/Buffer to a response
  return new NextResponse(data, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${fileName}"`,
    },
  });
}