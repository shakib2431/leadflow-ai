import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/hrms/apiAuth';
import { getScopedEmployeeId } from '@/lib/hrms/employeeScope';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { normalizeOnboardingChecklist } from '@/lib/hrms/onboardingChecklist';
import { sendNotificationEmail } from '@/lib/hrms/notification-email-service';

type PreOnboardingPayload = {
  emergency_contact_name: string;
  emergency_contact_phone: string;
  current_address: string;
  permanent_address: string;
  bank_name: string;
  bank_account_number?: string;
  ifsc_code?: string;
  pan?: string;
  aadhaar?: string;
  date_of_birth?: string;
  marital_status?: string;
  education?: string;
  prior_employer?: string;
  current_city?: string;
  work_location?: string;
  tshirt_size?: string;
  laptop_preference?: string;
  dietary_preferences?: string;
  preferred_joining_date: string;
  notes?: string;
  documents?: Array<{
    id: string;
    file_name: string;
    uploaded_at: string;
    document_type?: string;
  }>;
};

function normalizeText(value: unknown) {
  return String(value || '').trim();
}

function validatePayload(payload: PreOnboardingPayload) {
  const required: Array<keyof PreOnboardingPayload> = [
    'emergency_contact_name',
    'emergency_contact_phone',
    'current_address',
    'permanent_address',
    'bank_name',
    'preferred_joining_date',
  ];

  const missing = required.filter((field) => !normalizeText(payload[field]));
  if (missing.length > 0) {
    return { valid: false as const, error: 'Missing required fields', missing };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizeText(payload.preferred_joining_date))) {
    return { valid: false as const, error: 'preferred_joining_date must be YYYY-MM-DD' };
  }

  return { valid: true as const };
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ['Employee', 'HR Admin', 'HR Executive']);
  if (!auth.ok) return auth.response;

  const scope = await getScopedEmployeeId(auth as any);
  if (scope.response) return scope.response;
  if (!scope.employeeId) return NextResponse.json({ error: 'Employee profile not found for this user' }, { status: 404 });

  const { data, error } = await supabaseAdmin
    .from('employees')
    .select('id, onboarding_checklist')
    .eq('id', scope.employeeId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const checklist = normalizeOnboardingChecklist(data?.onboarding_checklist);
  const preOnboarding = checklist.pre_onboarding || null;
  return NextResponse.json({ data: preOnboarding });
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ['Employee']);
  if (!auth.ok) return auth.response;

  const scope = await getScopedEmployeeId(auth as any);
  if (scope.response) return scope.response;
  if (!scope.employeeId) return NextResponse.json({ error: 'Employee profile not found for this user' }, { status: 404 });

  try {
    const body = (await req.json()) as Partial<PreOnboardingPayload>;

    const payload: PreOnboardingPayload = {
      emergency_contact_name: normalizeText(body.emergency_contact_name),
      emergency_contact_phone: normalizeText(body.emergency_contact_phone),
      current_address: normalizeText(body.current_address),
      permanent_address: normalizeText(body.permanent_address),
      bank_name: normalizeText(body.bank_name),
      bank_account_number: normalizeText(body.bank_account_number),
      ifsc_code: normalizeText(body.ifsc_code),
      pan: normalizeText(body.pan),
      aadhaar: normalizeText(body.aadhaar),
      date_of_birth: normalizeText(body.date_of_birth),
      marital_status: normalizeText(body.marital_status),
      education: normalizeText(body.education),
      prior_employer: normalizeText(body.prior_employer),
      current_city: normalizeText(body.current_city),
      work_location: normalizeText(body.work_location),
      tshirt_size: normalizeText(body.tshirt_size),
      laptop_preference: normalizeText(body.laptop_preference),
      dietary_preferences: normalizeText(body.dietary_preferences),
      preferred_joining_date: normalizeText(body.preferred_joining_date),
      notes: normalizeText(body.notes),
      documents: Array.isArray(body.documents) ? body.documents : [],
    };

    const validation = validatePayload(payload);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error, missing: (validation as any).missing }, { status: 422 });
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('employees')
      .select('onboarding_checklist')
      .eq('id', scope.employeeId)
      .maybeSingle();

    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

    const checklist = normalizeOnboardingChecklist(existing?.onboarding_checklist);

    const existingDocs = Array.isArray(checklist.pre_onboarding?.form?.documents)
      ? checklist.pre_onboarding?.form?.documents
      : [];
    const incomingDocs = Array.isArray(payload.documents) ? payload.documents : [];
    const mergedDocs = [...existingDocs];
    for (const doc of incomingDocs) {
      if (!doc || !doc.id) continue;
      if (!mergedDocs.some((existingDoc: any) => String(existingDoc.id) === String(doc.id))) {
        mergedDocs.push(doc);
      }
    }

    const nextChecklist = {
      ...checklist,
      pre_onboarding: {
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        hr_reviewed_at: null,
        form: {
          ...payload,
          documents: mergedDocs,
        },
      },
    };

    const { error: updateError } = await supabaseAdmin
      .from('employees')
      .update({ onboarding_checklist: nextChecklist, updated_at: new Date().toISOString() })
      .eq('id', scope.employeeId);

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    // Best-effort admin notification email when configured.
    const notifyEnv = (process.env.HRMS_ADMIN_NOTIFICATION_EMAIL || process.env.HR_NOTIFICATION_EMAIL || '').trim();
    if (notifyEnv) {
      const recipients = notifyEnv
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean);

      if (recipients.length > 0) {
        const { data: employeeProfile } = await supabaseAdmin
          .from('employees')
          .select('first_name,last_name,email')
          .eq('id', scope.employeeId)
          .maybeSingle();

        const employeeName = `${employeeProfile?.first_name || ''} ${employeeProfile?.last_name || ''}`.trim() || 'Employee';
        const appBase = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '');
        const reviewLink = appBase ? `${appBase}/team/pre-onboarding` : '/team/pre-onboarding';

        await Promise.all(
          recipients.map((recipientEmail) =>
            sendNotificationEmail({
              event: 'pre_onboarding_submitted_admin',
              recipient_email: recipientEmail,
              recipient_name: 'HR Admin',
              subject: `Pre-Onboarding Submitted: ${employeeName}`,
              data: {
                employee_name: employeeName,
                employee_email: employeeProfile?.email || '',
                documents_count: mergedDocs.length,
                review_link: reviewLink,
              },
            })
          )
        );
      }
    }

    return NextResponse.json({ success: true, data: nextChecklist.pre_onboarding });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Invalid payload' }, { status: 400 });
  }
}
