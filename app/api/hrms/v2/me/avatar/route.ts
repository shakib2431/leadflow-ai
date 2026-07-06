import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { getScopedEmployeeId } from '@/lib/hrms/employeeScope';
import { supabaseAdmin } from '@/lib/supabase-admin';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const scope = await getScopedEmployeeId(auth as any);
  if (scope.response) return scope.response;
  if (!scope.employeeId) {
    return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart form data' }, { status: 400 });
  }

  const file = formData.get('avatar');
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json({ error: 'avatar field (file) is required' }, { status: 422 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type "${file.type}". Allowed: jpeg, png, webp` },
      { status: 422 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 10 MB limit' }, { status: 422 });
  }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const storagePath = `${scope.employeeId}/avatar.${ext}`;
  const bytes = await file.arrayBuffer();

  // Ensure the avatars bucket exists and is configured for larger uploads.
  const { data: buckets } = await supabaseAdmin.storage.listBuckets();
  const bucketExists = (buckets || []).some((b) => b.id === 'avatars');
  if (!bucketExists) {
    await supabaseAdmin.storage.createBucket('avatars', {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
  } else {
    await supabaseAdmin.storage.updateBucket('avatars', {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    });
  }

  // Remove old avatar files for this employee (all extensions)
  await supabaseAdmin.storage.from('avatars').remove([
    `${scope.employeeId}/avatar.jpg`,
    `${scope.employeeId}/avatar.png`,
    `${scope.employeeId}/avatar.webp`,
  ]);

  const { error: uploadError } = await supabaseAdmin.storage
    .from('avatars')
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: publicData } = supabaseAdmin.storage.from('avatars').getPublicUrl(storagePath);
  const avatarUrl = `${publicData.publicUrl}?t=${Date.now()}`;

  let { error: dbError } = await supabaseAdmin
    .from('employees')
    .update({ avatar_url: avatarUrl, photo_url: avatarUrl })
    .eq('id', scope.employeeId);

  // Backward-compatible fallback for schemas without avatar_url column
  if (dbError && String(dbError.message).includes('avatar_url')) {
    const fallback = await supabaseAdmin
      .from('employees')
      .update({ photo_url: avatarUrl })
      .eq('id', scope.employeeId);
    dbError = fallback.error || null;
  }

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ data: { avatar_url: avatarUrl } });
}

export async function DELETE(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;

  const scope = await getScopedEmployeeId(auth as any);
  if (scope.response) return scope.response;
  if (!scope.employeeId) {
    return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
  }

  await supabaseAdmin.storage.from('avatars').remove([
    `${scope.employeeId}/avatar.jpg`,
    `${scope.employeeId}/avatar.png`,
    `${scope.employeeId}/avatar.webp`,
  ]);

  let { error: clearError } = await supabaseAdmin
    .from('employees')
    .update({ avatar_url: null, photo_url: null })
    .eq('id', scope.employeeId);

  if (clearError && String(clearError.message).includes('avatar_url')) {
    const fallback = await supabaseAdmin
      .from('employees')
      .update({ photo_url: null })
      .eq('id', scope.employeeId);
    clearError = fallback.error || null;
  }

  if (clearError) return NextResponse.json({ error: clearError.message }, { status: 500 });

  return NextResponse.json({ data: { avatar_url: null } });
}
