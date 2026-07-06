import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { requireRole } from '@/lib/hrms/apiAuth';
import { logHRMSAudit } from '@/lib/hrms/audit';

const FILE_PATH = path.join(process.cwd(), 'tmp', 'hrms-role-permissions.json');

type Matrix = Record<string, string[]>;

const DEFAULT_MATRIX: Matrix = {
  'HR Admin': [
    'employees.read', 'employees.write', 'employees.archive',
    'payroll.read', 'payroll.write', 'payroll.approve',
    'attendance.read', 'attendance.write', 'attendance.review',
    'leave.read', 'leave.write', 'leave.approve',
    'settings.read', 'settings.write',
    'audit.read', 'reports.read', 'reports.export',
    'roles.read', 'roles.write',
    'backup.read', 'backup.write',
  ],
  'HR Executive': [
    'employees.read', 'employees.write',
    'payroll.read', 'payroll.write',
    'attendance.read', 'attendance.write',
    'leave.read', 'leave.write', 'leave.approve',
    'settings.read',
    'audit.read', 'reports.read', 'reports.export',
    'roles.read',
    'backup.read',
  ],
  Employee: [
    'self.read', 'self.write',
    'leave.read', 'leave.write',
    'payroll.read', 'attendance.read',
  ],
};

function normalizeMatrix(input: any): Matrix {
  const out: Matrix = {};
  for (const role of ['HR Admin', 'HR Executive', 'Employee']) {
    const list = Array.isArray(input?.[role]) ? input[role] : DEFAULT_MATRIX[role];
    out[role] = Array.from(new Set(list.map((item: any) => String(item || '').trim()).filter(Boolean))).sort();
  }
  return out;
}

async function readMatrix(): Promise<Matrix> {
  try {
    const text = await fs.readFile(FILE_PATH, 'utf8');
    return normalizeMatrix(JSON.parse(text));
  } catch {
    return normalizeMatrix(DEFAULT_MATRIX);
  }
}

async function writeMatrix(matrix: Matrix) {
  await fs.mkdir(path.dirname(FILE_PATH), { recursive: true });
  await fs.writeFile(FILE_PATH, JSON.stringify(matrix, null, 2), 'utf8');
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  const data = await readMatrix();
  return NextResponse.json({ data });
}

export async function PUT(req: Request) {
  const auth = await requireRole(req, ['HR Admin']);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const data = normalizeMatrix(body);
    await writeMatrix(data);

    await logHRMSAudit({
      action: 'role_permissions_updated',
      entity_type: 'role_permissions',
      actor_id: auth.userId,
      actor_email: auth.email,
      actor_role: auth.role,
      metadata: {
        admin_permissions: data['HR Admin'].length,
        executive_permissions: data['HR Executive'].length,
        employee_permissions: data['Employee'].length,
      },
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}
