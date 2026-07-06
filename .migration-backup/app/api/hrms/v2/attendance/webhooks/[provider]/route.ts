import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getAttendanceSourceById, runAttendanceSync } from '@/lib/hrms/attendanceSources';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { mapBiometricPayload } from '@/lib/hrms/biometric-adapters';

const VALID_PROVIDERS = new Set(['biometric_api']);

function normalizeDate(input?: string | null) {
  const value = String(input || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return value;
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function verifySignature(body: string, signature: string, secret: string) {
  const digest = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('hex');
  const prefixed = `sha256=${digest}`;
  return safeEqual(signature, prefixed) || safeEqual(signature, digest);
}

export async function POST(req: Request, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const route = await params;
    const provider = String(route?.provider || '').trim().toLowerCase();

    if (!VALID_PROVIDERS.has(provider)) {
      return NextResponse.json({ error: 'Unsupported attendance webhook provider' }, { status: 404 });
    }

    const secret = String(process.env.ATTENDANCE_WEBHOOK_SECRET || '').trim();
    if (!secret) {
      return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
    }

    const signature = String(req.headers.get('x-attendance-signature') || req.headers.get('x-signature') || '').trim();
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature header' }, { status: 401 });
    }

    const rawBody = await req.text();
    if (!verifySignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
    }

    let payload: any;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const sourceId = String(payload?.source_id || '').trim();
    const syncDate = normalizeDate(payload?.sync_date) || new Date().toISOString().slice(0, 10);
    if (!sourceId) {
      return NextResponse.json({ error: 'source_id is required' }, { status: 422 });
    }

    const source = await getAttendanceSourceById(sourceId);
    if (!source) {
      return NextResponse.json({ error: 'Attendance source not found' }, { status: 404 });
    }

    if (source.provider !== 'biometric_api') {
      return NextResponse.json({ error: 'Source provider mismatch. Expected biometric_api source.' }, { status: 422 });
    }

    const vendor = String(source.config?.vendor || payload?.vendor || 'generic').trim().toLowerCase();
    const mapped = mapBiometricPayload(vendor, payload, syncDate);

    const resolveByCodeCache = new Map<string, string | null>();
    async function resolveEmployeeIdFromCode(employeeCode: string) {
      const code = String(employeeCode || '').trim();
      if (!code) return null;
      if (resolveByCodeCache.has(code)) return resolveByCodeCache.get(code) || null;

      const { data } = await supabaseAdmin.from('employees').select('id').eq('employee_code', code).maybeSingle();
      const id = data?.id || null;
      resolveByCodeCache.set(code, id);
      return id;
    }

    const entries: Array<{ employee_id: string; date: string; status: 'present' | 'absent' | 'half_day' }> = [];
    for (const row of mapped.rows) {
      let employeeId = String(row.employee_id || '').trim();
      const employeeCode = String(row.employee_code || '').trim();

      if (!employeeId && employeeCode) {
        employeeId = String((await resolveEmployeeIdFromCode(employeeCode)) || '');
      }

      const date = normalizeDate(row.date) || syncDate;
      const status = row.status;
      if (!employeeId || !date || !status) continue;
      entries.push({ employee_id: employeeId, date, status });
    }

    if (entries.length === 0) {
      return NextResponse.json({ error: 'No valid entries after validation' }, { status: 422 });
    }

    const data = await runAttendanceSync({
      sourceId,
      syncDate,
      entries: entries as any,
      triggeredBy: `webhook:${provider}`,
      metadata: {
        ingest_mode: 'webhook',
        vendor,
        webhook_provider: provider,
        webhook_event_id: payload?.event_id || payload?.eventId || null,
        webhook_device_serial: payload?.device_serial || payload?.deviceSerial || null,
        adapter_audit: mapped.audit,
        adapter_errors: mapped.errors.slice(0, 100),
      },
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 400 });
  }
}
