import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { getScopedEmployeeId } from '@/lib/hrms/employeeScope';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizeOnboardingChecklist } from '@/lib/hrms/onboardingChecklist';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const ALLOWED_DOCUMENT_TYPES = new Set([
  'id_proof',
  'address_proof',
  'bank_proof',
  'education_proof',
  'other',
]);

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ['Employee']);
  if (!auth.ok) return auth.response;

  const scope = await getScopedEmployeeId(auth as any);
  if (scope.response) return scope.response;
  if (!scope.employeeId) return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const file = formData.get('file');
  const rawDocumentType = String(formData.get('document_type') || 'other').trim().toLowerCase();
  const documentType = ALLOWED_DOCUMENT_TYPES.has(rawDocumentType) ? rawDocumentType : 'other';

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'file is required' }, { status: 422 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type. Allowed: PDF/JPEG/PNG/WEBP' }, { status: 422 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 5 MB limit' }, { status: 422 });
  }

  const ext = file.type === 'application/pdf'
    ? 'pdf'
    : file.type === 'image/png'
    ? 'png'
    : file.type === 'image/webp'
    ? 'webp'
    : 'jpg';

  const safeName = sanitizeFileName((file as any).name || `document.${ext}`);
  const storagePath = `${scope.employeeId}/pre-onboarding/${Date.now()}-${safeName}`;
  const bytes = await file.arrayBuffer();

  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const bucketExists = (buckets || []).some((b) => b.id === 'hr-docs');
  if (!bucketExists) {
    await supabaseAdmin.storage.createBucket('hr-docs', {
      public: false,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    });
  }

  const { error: uploadError } = await supabaseAdmin.storage
    .from('hr-docs')
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const fileName = (file as any).name || safeName;
  const secureViewPath = `/api/hrms/v2/employees/${scope.employeeId}/documents/${safeName}`;

  const { data: documentRow, error: documentInsertError } = await supabaseAdmin
    .from('employee_documents')
    .insert([{
      employee_id: scope.employeeId,
      file_name: fileName,
      file_path: secureViewPath,
      storage_path: storagePath,
    }])
    .select('id,file_name,created_at')
    .single();

  if (documentInsertError) {
    await supabaseAdmin.storage.from('hr-docs').remove([storagePath]);
    return NextResponse.json({ error: documentInsertError.message }, { status: 500 });
  }

  const { data: employee, error: employeeErr } = await supabaseAdmin
    .from('employees')
    .select('onboarding_checklist')
    .eq('id', scope.employeeId)
    .maybeSingle();

  if (employeeErr) return NextResponse.json({ error: employeeErr.message }, { status: 500 });

  const checklist = normalizeOnboardingChecklist(employee?.onboarding_checklist);
  const existingDocuments = Array.isArray(checklist.pre_onboarding?.form?.documents)
    ? checklist.pre_onboarding?.form?.documents
    : [];

  const docMeta = {
    id: String(documentRow.id),
    file_name: String(documentRow.file_name || fileName),
    uploaded_at: String(documentRow.created_at || new Date().toISOString()),
    document_type: documentType,
  };

  const nextChecklist = {
    ...checklist,
    pre_onboarding: {
      ...(checklist.pre_onboarding || {}),
      form: {
        ...((checklist.pre_onboarding?.form || {}) as Record<string, any>),
        documents: [...existingDocuments, docMeta],
      },
    },
  };

  const { error: updateError } = await supabaseAdmin
    .from('employees')
    .update({ onboarding_checklist: nextChecklist, updated_at: new Date().toISOString() })
    .eq('id', scope.employeeId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ data: docMeta }, { status: 201 });
}
