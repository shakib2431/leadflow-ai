import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { readAttendanceSyncArtifact } from '@/lib/hrms/attendanceSources';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  try {
    const route = await params;
    const artifactId = String(route?.id || '').trim();
    const artifact = await readAttendanceSyncArtifact(artifactId);

    const fileName = `attendance-sync-artifact-${artifact.artifact_id}.json`;
    return NextResponse.json(artifact.content, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Artifact-Path': artifact.file_path,
      },
    });
  } catch (err: any) {
    const msg = String(err?.message || 'Failed to read artifact');
    const status = msg.toLowerCase().includes('invalid artifact id') ? 422 : msg.toLowerCase().includes('enoent') ? 404 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
