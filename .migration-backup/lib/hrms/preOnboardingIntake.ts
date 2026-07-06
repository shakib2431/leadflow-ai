import crypto from 'crypto';

const DEFAULT_TTL_DAYS = 14;

type IntakePayload = {
  employee_id: string;
  exp: number;
};

function getSigningSecret() {
  return (
    process.env.HRMS_PRE_ONBOARDING_LINK_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_JWT_SECRET ||
    'dev-pre-onboarding-secret'
  );
}

function toBase64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(input: string) {
  const base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

export function createPreOnboardingIntakeToken(employeeId: string, ttlDays = DEFAULT_TTL_DAYS) {
  const exp = Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60;
  const payload: IntakePayload = { employee_id: employeeId, exp };
  const payloadEncoded = toBase64Url(JSON.stringify(payload));

  const signature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payloadEncoded)
    .digest();

  return `${payloadEncoded}.${toBase64Url(signature)}`;
}

export function verifyPreOnboardingIntakeToken(token: string): IntakePayload | null {
  const [payloadEncoded, signatureEncoded] = String(token || '').split('.');
  if (!payloadEncoded || !signatureEncoded) return null;

  const expectedSig = crypto
    .createHmac('sha256', getSigningSecret())
    .update(payloadEncoded)
    .digest();

  const receivedSig = Buffer.from(
    signatureEncoded.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(signatureEncoded.length / 4) * 4, '='),
    'base64'
  );

  if (receivedSig.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(receivedSig, expectedSig)) return null;

  try {
    const payload = JSON.parse(fromBase64Url(payloadEncoded)) as IntakePayload;
    if (!payload.employee_id || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildPublicPreOnboardingLink(employeeId: string, appBaseUrl?: string) {
  const token = createPreOnboardingIntakeToken(employeeId);
  const base = (appBaseUrl || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/pre-onboarding/${token}`;
}
