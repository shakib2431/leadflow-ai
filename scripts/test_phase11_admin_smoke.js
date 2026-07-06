const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, options = {}) {
  const headers = {
    'x-dev-mode': 'true',
    ...(options.headers || {}),
  };

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return {
    status: res.status,
    ok: res.ok,
    body: json,
    raw: text,
  };
}

async function run() {
  console.log(`Phase 11 admin smoke test against ${baseUrl}`);

  const settingsGet = await request('/api/hrms/v2/admin/settings');
  assert(settingsGet.ok, `GET /admin/settings failed with ${settingsGet.status}`);
  assert(settingsGet.body?.data, 'GET /admin/settings missing data');
  console.log('OK GET /admin/settings');

  const settingsPayload = {
    default_currency: 'INR',
    timezone: 'Asia/Kolkata',
    attendance_cutoff_day: 24,
    leave_auto_approval: false,
    payroll_approval_required: true,
  };

  const settingsPut = await request('/api/hrms/v2/admin/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settingsPayload),
  });
  assert(settingsPut.ok, `PUT /admin/settings failed with ${settingsPut.status}`);
  assert(settingsPut.body?.data?.attendance_cutoff_day === 24, 'PUT /admin/settings did not persist attendance_cutoff_day');
  console.log('OK PUT /admin/settings');

  const roleGet = await request('/api/hrms/v2/admin/role-permissions');
  assert(roleGet.ok, `GET /admin/role-permissions failed with ${roleGet.status}`);
  assert(Array.isArray(roleGet.body?.permission_keys), 'GET /admin/role-permissions missing permission_keys');
  assert(Array.isArray(roleGet.body?.data), 'GET /admin/role-permissions missing matrix data');
  assert(roleGet.body.data.length >= roleGet.body.permission_keys.length * 3, 'Role matrix is incomplete');
  console.log('OK GET /admin/role-permissions');

  const roleRows = roleGet.body.data;
  const target = roleRows.find((row) => row.role === 'HR Executive' && row.permission_key === 'view_reports') || roleRows[0];
  assert(target, 'No role permission row available to update');

  const rolePut = await request('/api/hrms/v2/admin/role-permissions', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rows: [
        {
          role: target.role,
          permission_key: target.permission_key,
          is_allowed: !target.is_allowed,
        },
      ],
    }),
  });
  assert(rolePut.ok, `PUT /admin/role-permissions failed with ${rolePut.status}`);
  assert(Array.isArray(rolePut.body?.data), 'PUT /admin/role-permissions missing data');
  console.log('OK PUT /admin/role-permissions');

  const auditGet = await request('/api/hrms/v2/admin/audit-logs?page=1&pageSize=5');
  assert(auditGet.ok, `GET /admin/audit-logs failed with ${auditGet.status}`);
  assert(Array.isArray(auditGet.body?.data), 'GET /admin/audit-logs missing data array');
  assert(auditGet.body?.meta?.page === 1, 'GET /admin/audit-logs wrong page meta');
  console.log('OK GET /admin/audit-logs');

  const backupGet = await request('/api/hrms/v2/admin/backup-config');
  assert(backupGet.ok, `GET /admin/backup-config failed with ${backupGet.status}`);
  assert(backupGet.body?.data?.config, 'GET /admin/backup-config missing config');
  console.log('OK GET /admin/backup-config');

  const backupPut = await request('/api/hrms/v2/admin/backup-config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      enabled: true,
      frequency: 'daily',
      retention_days: 60,
      storage_target: 'local_tmp',
      notes: 'phase11 smoke',
    }),
  });
  assert(backupPut.ok, `PUT /admin/backup-config failed with ${backupPut.status}`);
  assert(backupPut.body?.data?.retention_days === 60, 'PUT /admin/backup-config did not persist retention_days');
  console.log('OK PUT /admin/backup-config');

  const backupPost = await request('/api/hrms/v2/admin/backup-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert(backupPost.ok, `POST /admin/backup-config failed with ${backupPost.status}`);
  assert(backupPost.body?.data?.id, 'POST /admin/backup-config missing run id');
  console.log('OK POST /admin/backup-config');

  console.log('Phase 11 admin smoke test completed successfully.');
}

run().catch((err) => {
  console.error('Phase 11 admin smoke test failed:', err.message);
  process.exit(1);
});
