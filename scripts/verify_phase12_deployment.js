const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function fetchJson(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  return { response, body, text };
}

async function run() {
  console.log(`Phase 12 deployment verification against ${baseUrl}`);

  const requiredEnv = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missing = requiredEnv.filter((k) => !String(process.env[k] || '').trim());
  if (missing.length > 0) {
    console.log('WARN Missing required deployment env vars in current shell:', missing.join(', '));
    console.log('WARN Continue only because runtime may still have them configured externally.');
  } else {
    console.log('OK Required env var presence check passed in current shell.');
  }

  const rootResponse = await fetch(`${baseUrl}/`);
  assert(rootResponse.ok, `GET / failed with ${rootResponse.status}`);
  const securityHeaders = [
    'x-frame-options',
    'x-content-type-options',
    'referrer-policy',
    'permissions-policy',
  ];

  for (const header of securityHeaders) {
    const value = rootResponse.headers.get(header);
    assert(value, `Missing security header: ${header}`);
  }
  console.log('OK Security headers present on GET /.');

  const genericHealth = await fetchJson('/api/health');
  assert(genericHealth.response.ok, `GET /api/health failed with ${genericHealth.response.status}`);
  assert(genericHealth.body?.status === 'ok', 'GET /api/health returned invalid payload');
  console.log('OK GET /api/health');

  const hrmsHealth = await fetchJson('/api/hrms/v2/health');
  assert(hrmsHealth.response.ok, `GET /api/hrms/v2/health failed with ${hrmsHealth.response.status}`);
  assert(hrmsHealth.body?.status === 'ok', 'GET /api/hrms/v2/health returned invalid payload');
  console.log('OK GET /api/hrms/v2/health');

  const adminSettings = await fetchJson('/api/hrms/v2/admin/settings', {
    headers: { 'x-dev-mode': 'true' },
  });
  assert(adminSettings.response.ok, `GET /api/hrms/v2/admin/settings failed with ${adminSettings.response.status}`);
  assert(adminSettings.body?.data, 'GET /api/hrms/v2/admin/settings missing data');
  console.log('OK GET /api/hrms/v2/admin/settings');

  const reportSummary = await fetchJson('/api/hrms/v2/reports/summary?month=6&year=2026', {
    headers: { 'x-dev-mode': 'true' },
  });
  assert(reportSummary.response.ok, `GET /api/hrms/v2/reports/summary failed with ${reportSummary.response.status}`);
  console.log('OK GET /api/hrms/v2/reports/summary');

  console.log('Phase 12 deployment verification completed successfully.');
}

run().catch((err) => {
  console.error('Phase 12 deployment verification failed:', err.message);
  process.exit(1);
});
