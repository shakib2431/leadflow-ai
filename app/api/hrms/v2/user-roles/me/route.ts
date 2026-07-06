import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive', 'Employee']);
  if (!auth.ok) return auth.response;
  return NextResponse.json({ data: { user_id: auth.userId, role: auth.role } });
}
