const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEFAULT_PASSWORD = process.env.STAGING_DEFAULT_PASSWORD || 'ChangeMe!12345';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function slug(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

async function ensureAuthUser(email, role) {
  const normalizedEmail = String(email).trim().toLowerCase();

  const createRes = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password: DEFAULT_PASSWORD,
    email_confirm: true,
    user_metadata: { seeded: true, role_hint: role },
  });

  if (!createRes.error && createRes.data?.user?.id) {
    return createRes.data.user.id;
  }

  const listRes = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listRes.error) {
    throw new Error(`Unable to list users for ${normalizedEmail}: ${listRes.error.message}`);
  }

  const existing = (listRes.data?.users || []).find((u) => String(u.email || '').toLowerCase() === normalizedEmail);
  if (!existing?.id) {
    throw new Error(`Unable to create/find auth user for ${normalizedEmail}`);
  }

  return existing.id;
}

async function ensureUserRole(userId, role) {
  const { error } = await supabase
    .from('user_roles')
    .upsert({ user_id: String(userId), role: String(role) }, { onConflict: 'user_id' });

  if (error) throw new Error(`Failed role upsert for ${userId}: ${error.message}`);
}

async function ensureBusinessEntity(name, code) {
  const { data: existing, error: readErr } = await supabase
    .from('business_entities')
    .select('id, name')
    .eq('name', name)
    .maybeSingle();

  if (readErr) throw new Error(`Entity read failed: ${readErr.message}`);
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from('business_entities')
    .insert([{ name, code, is_active: true }])
    .select('id')
    .single();

  if (error) throw new Error(`Entity create failed: ${error.message}`);
  return data.id;
}

async function ensureDepartment(name, entityId, code) {
  const { data: existing, error: readErr } = await supabase
    .from('departments')
    .select('id, name, business_entity_id')
    .eq('name', name)
    .eq('business_entity_id', entityId)
    .maybeSingle();

  if (readErr) throw new Error(`Department read failed: ${readErr.message}`);
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from('departments')
    .insert([{ name, business_entity_id: entityId, code, is_active: true }])
    .select('id')
    .single();

  if (error) throw new Error(`Department create failed: ${error.message}`);
  return data.id;
}

async function ensureDesignation(name, entityId, level) {
  const { data: existing, error: readErr } = await supabase
    .from('designations')
    .select('id, name, business_entity_id')
    .eq('name', name)
    .eq('business_entity_id', entityId)
    .maybeSingle();

  if (readErr) throw new Error(`Designation read failed: ${readErr.message}`);
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from('designations')
    .insert([{ name, business_entity_id: entityId, level, is_active: true }])
    .select('id')
    .single();

  if (error) throw new Error(`Designation create failed: ${error.message}`);
  return data.id;
}

function checklist(status) {
  if (status === 'active') {
    return [
      { id: 'contract', title: 'Sign Employment Contract', status: 'completed', type: 'send_doc' },
      { id: 'id', title: 'Upload Government ID', status: 'completed', type: 'upload' },
      { id: 'handbook', title: 'Review Employee Handbook', status: 'completed', type: 'review' },
    ];
  }

  return [
    { id: 'contract', title: 'Sign Employment Contract', status: 'action_required', type: 'send_doc' },
    { id: 'id', title: 'Upload Government ID', status: 'pending_employee', type: 'upload' },
    { id: 'handbook', title: 'Review Employee Handbook', status: 'pending_employee', type: 'review' },
  ];
}

async function ensureEmployee(payload) {
  const email = String(payload.email).trim().toLowerCase();

  const { data: existing, error: readErr } = await supabase
    .from('employees')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  if (readErr) throw new Error(`Employee read failed (${email}): ${readErr.message}`);
  if (existing?.id) return existing.id;

  const body = {
    ...payload,
    email,
    onboarding_checklist: checklist(payload.status || 'active'),
  };

  const { data, error } = await supabase
    .from('employees')
    .insert([body])
    .select('id')
    .single();

  if (error) throw new Error(`Employee create failed (${email}): ${error.message}`);
  return data.id;
}

async function ensureAttendance(employeeId, date, status) {
  const { error } = await supabase
    .from('attendance_records')
    .upsert({ employee_id: employeeId, date, status, updated_at: new Date().toISOString() }, { onConflict: 'employee_id,date' });
  if (error) throw new Error(`Attendance upsert failed: ${error.message}`);
}

async function ensureLeaveRequest(employeeId, leaveType, startDate, endDate, daysCount) {
  const { data: existing, error: readErr } = await supabase
    .from('leave_requests')
    .select('id')
    .eq('employee_id', employeeId)
    .eq('leave_type', leaveType)
    .eq('start_date', startDate)
    .eq('end_date', endDate)
    .maybeSingle();

  if (readErr) throw new Error(`Leave read failed: ${readErr.message}`);
  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from('leave_requests')
    .insert([{ employee_id: employeeId, leave_type: leaveType, start_date: startDate, end_date: endDate, days_count: daysCount, status: 'pending' }])
    .select('id')
    .single();

  if (error) throw new Error(`Leave create failed: ${error.message}`);
  return data.id;
}

function dateOffset(days) {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

async function seed() {
  console.log('Seeding production-like HRMS staging data...');

  const entities = [
    { name: 'North Headquarters', code: 'NORTH-HQ' },
    { name: 'South Operations Center', code: 'SOUTH-OPS' },
  ];

  const entityIds = {};
  for (const e of entities) {
    entityIds[e.name] = await ensureBusinessEntity(e.name, e.code);
  }

  const departments = [
    { name: 'Human Resources', entity: 'North Headquarters', code: 'HR' },
    { name: 'Finance', entity: 'North Headquarters', code: 'FIN' },
    { name: 'Engineering', entity: 'North Headquarters', code: 'ENG' },
    { name: 'Operations', entity: 'South Operations Center', code: 'OPS' },
    { name: 'Sales', entity: 'South Operations Center', code: 'SAL' },
  ];

  const departmentIds = {};
  for (const d of departments) {
    departmentIds[d.name] = await ensureDepartment(d.name, entityIds[d.entity], d.code);
  }

  const designations = [
    { name: 'HR Admin', entity: 'North Headquarters', level: 'L5' },
    { name: 'HR Executive', entity: 'North Headquarters', level: 'L3' },
    { name: 'Engineering Manager', entity: 'North Headquarters', level: 'L4' },
    { name: 'Operations Manager', entity: 'South Operations Center', level: 'L4' },
    { name: 'Software Engineer', entity: 'North Headquarters', level: 'L2' },
    { name: 'Operations Executive', entity: 'South Operations Center', level: 'L2' },
    { name: 'Sales Executive', entity: 'South Operations Center', level: 'L2' },
  ];

  const designationIds = {};
  for (const d of designations) {
    designationIds[d.name] = await ensureDesignation(d.name, entityIds[d.entity], d.level);
  }

  const roleUsers = [
    { email: 'staging.hradmin@leadflow.test', role: 'HR Admin' },
    { email: 'staging.hrexec@leadflow.test', role: 'HR Executive' },
    { email: 'staging.employee@leadflow.test', role: 'Employee' },
  ];

  for (const u of roleUsers) {
    const userId = await ensureAuthUser(u.email, u.role);
    await ensureUserRole(userId, u.role);
  }

  const managerProfiles = [
    {
      first_name: 'Nora',
      last_name: 'Shaw',
      email: 'staging.manager.engineering@leadflow.test',
      phone: '9000001001',
      gender: 'Female',
      status: 'active',
      employment_status: 'active',
      date_of_joining: '2022-02-01',
      work_location: 'office',
      work_state: 'Karnataka',
      business_entity_id: entityIds['North Headquarters'],
      department_id: departmentIds['Engineering'],
      designation_id: designationIds['Engineering Manager'],
    },
    {
      first_name: 'Rahul',
      last_name: 'Dev',
      email: 'staging.manager.operations@leadflow.test',
      phone: '9000001002',
      gender: 'Male',
      status: 'active',
      employment_status: 'active',
      date_of_joining: '2021-07-15',
      work_location: 'office',
      work_state: 'Tamil Nadu',
      business_entity_id: entityIds['South Operations Center'],
      department_id: departmentIds['Operations'],
      designation_id: designationIds['Operations Manager'],
    },
  ];

  const managerIds = [];
  for (const profile of managerProfiles) {
    const managerId = await ensureEmployee(profile);
    managerIds.push(managerId);
    const role = profile.department_id === departmentIds['Engineering'] ? 'HR Executive' : 'HR Executive';
    const userId = await ensureAuthUser(profile.email, role);
    await ensureUserRole(userId, role);
  }

  const employeeSeeds = [];
  for (let i = 1; i <= 24; i += 1) {
    const isEng = i % 2 === 0;
    const entityName = isEng ? 'North Headquarters' : 'South Operations Center';
    const deptName = isEng ? 'Engineering' : i % 3 === 0 ? 'Sales' : 'Operations';
    const designationName = isEng ? 'Software Engineer' : deptName === 'Sales' ? 'Sales Executive' : 'Operations Executive';
    const managerId = isEng ? managerIds[0] : managerIds[1];

    employeeSeeds.push({
      first_name: `Test${i}`,
      last_name: isEng ? 'Engineer' : 'Operator',
      email: `staging.employee${String(i).padStart(2, '0')}@leadflow.test`,
      phone: `9000002${String(i).padStart(3, '0')}`,
      gender: i % 2 === 0 ? 'Male' : 'Female',
      status: i <= 20 ? 'active' : 'onboarding',
      employment_status: i <= 20 ? 'active' : 'onboarding',
      date_of_joining: dateOffset(-120 + i),
      work_location: i % 3 === 0 ? 'remote' : 'office',
      work_state: isEng ? 'Karnataka' : 'Tamil Nadu',
      business_entity_id: entityIds[entityName],
      department_id: departmentIds[deptName],
      designation_id: designationIds[designationName],
      reporting_manager_id: managerId,
    });
  }

  const employeeIds = [];
  for (const e of employeeSeeds) {
    const employeeId = await ensureEmployee(e);
    employeeIds.push(employeeId);
    const userId = await ensureAuthUser(e.email, 'Employee');
    await ensureUserRole(userId, 'Employee');
  }

  const allForAttendance = [...managerIds, ...employeeIds].slice(0, 20);
  for (const employeeId of allForAttendance) {
    for (let day = -14; day <= -1; day += 1) {
      const d = new Date(Date.now() + day * 24 * 60 * 60 * 1000);
      const weekday = d.getUTCDay();
      const status = weekday === 0 || weekday === 6 ? 'absent' : 'present';
      await ensureAttendance(employeeId, d.toISOString().slice(0, 10), status);
    }
  }

  for (let i = 0; i < Math.min(employeeIds.length, 8); i += 1) {
    const start = dateOffset(i + 2);
    const end = dateOffset(i + 3);
    await ensureLeaveRequest(employeeIds[i], 'casual', start, end, 2);
  }

  console.log('Seed complete.');
  console.log('Summary:');
  console.log('- 2 business entities');
  console.log('- 5 departments');
  console.log('- 7 designations');
  console.log('- 3 direct role users (HR Admin, HR Executive, Employee)');
  console.log('- 2 manager employees');
  console.log('- 24 employees');
  console.log('- attendance data for 20 users (past 14 days)');
  console.log('- 8 pending leave requests');
  console.log('Default password used for seeded auth users:', DEFAULT_PASSWORD);
}

seed().catch((err) => {
  console.error('Staging seed failed:', err.message);
  process.exit(1);
});
