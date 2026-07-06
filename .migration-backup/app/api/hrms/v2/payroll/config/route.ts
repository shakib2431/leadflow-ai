import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';

type PayrollConfig = {
  cycleStartDay: number;
  cutoffDay: number;
  approvalRequired: boolean;
};

const DEFAULT_CONFIG: PayrollConfig = {
  cycleStartDay: 1,
  cutoffDay: 25,
  approvalRequired: true,
};

const CONFIG_DIR = path.join(process.cwd(), 'tmp');
const CONFIG_PATH = path.join(CONFIG_DIR, 'payroll-config.json');

function toInt(value: unknown, fallback: number) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.floor(num);
}

function normalizeConfig(input: Partial<PayrollConfig> | null | undefined): PayrollConfig {
  const cycleStartDay = toInt(input?.cycleStartDay, DEFAULT_CONFIG.cycleStartDay);
  const cutoffDay = toInt(input?.cutoffDay, DEFAULT_CONFIG.cutoffDay);

  return {
    cycleStartDay: cycleStartDay >= 1 && cycleStartDay <= 28 ? cycleStartDay : DEFAULT_CONFIG.cycleStartDay,
    cutoffDay: cutoffDay >= 1 && cutoffDay <= 31 ? cutoffDay : DEFAULT_CONFIG.cutoffDay,
    approvalRequired: typeof input?.approvalRequired === 'boolean' ? input.approvalRequired : DEFAULT_CONFIG.approvalRequired,
  };
}

async function readConfigFile() {
  try {
    const content = await readFile(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(content);
    return normalizeConfig(parsed);
  } catch {
    return DEFAULT_CONFIG;
  }
}

async function writeConfigFile(config: PayrollConfig) {
  await mkdir(CONFIG_DIR, { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ['HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  const data = await readConfigFile();
  return NextResponse.json({ data });
}

export async function PUT(req: Request) {
  const auth = await requireRole(req, ['HR Admin']);
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const cycleStartDay = toInt(body.cycleStartDay, DEFAULT_CONFIG.cycleStartDay);
    const cutoffDay = toInt(body.cutoffDay, DEFAULT_CONFIG.cutoffDay);
    const approvalRequired = Boolean(body.approvalRequired);

    if (cycleStartDay < 1 || cycleStartDay > 28) {
      return NextResponse.json({ error: 'cycleStartDay must be between 1 and 28' }, { status: 422 });
    }

    if (cutoffDay < 1 || cutoffDay > 31) {
      return NextResponse.json({ error: 'cutoffDay must be between 1 and 31' }, { status: 422 });
    }

    const nextConfig = normalizeConfig({
      cycleStartDay,
      cutoffDay,
      approvalRequired,
    });

    await writeConfigFile(nextConfig);

    return NextResponse.json({
      data: nextConfig,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}
