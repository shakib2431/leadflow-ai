-- HRMS staging seed (production-like)
-- Run in Supabase SQL Editor against STAGING only.
-- This script is idempotent for core records (uses fixed UUIDs + conflict handling).

begin;

-- ---------------------------------------------------------------------
-- 0) Business entities
-- ---------------------------------------------------------------------
insert into public.business_entities (id, name, code, is_active)
values
  ('10000000-0000-0000-0000-000000000001', 'North Headquarters', 'NORTH-HQ', true),
  ('10000000-0000-0000-0000-000000000002', 'South Operations Center', 'SOUTH-OPS', true)
on conflict (id) do update
set name = excluded.name,
    code = excluded.code,
    is_active = excluded.is_active;

-- ---------------------------------------------------------------------
-- 1) Departments
-- ---------------------------------------------------------------------
insert into public.departments (id, business_entity_id, name, code, is_active)
values
  ('11000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Human Resources', 'HR', true),
  ('11000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'Finance', 'FIN', true),
  ('11000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Engineering', 'ENG', true),
  ('11000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'Operations', 'OPS', true),
  ('11000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', 'Sales', 'SAL', true)
on conflict (id) do update
set business_entity_id = excluded.business_entity_id,
    name = excluded.name,
    code = excluded.code,
    is_active = excluded.is_active;

-- ---------------------------------------------------------------------
-- 2) Designations
-- ---------------------------------------------------------------------
insert into public.designations (id, business_entity_id, name, level, is_active)
values
  ('12000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'HR Admin', 'L5', true),
  ('12000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', 'HR Executive', 'L3', true),
  ('12000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'Engineering Manager', 'L4', true),
  ('12000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000002', 'Operations Manager', 'L4', true),
  ('12000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000001', 'Software Engineer', 'L2', true),
  ('12000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000002', 'Operations Executive', 'L2', true),
  ('12000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000002', 'Sales Executive', 'L2', true)
on conflict (id) do update
set business_entity_id = excluded.business_entity_id,
    name = excluded.name,
    level = excluded.level,
    is_active = excluded.is_active;

-- ---------------------------------------------------------------------
-- 3) Employees (managers + admin/executive + 24 employees)
-- ---------------------------------------------------------------------
insert into public.employees (
  id, employee_code, first_name, last_name, email, phone, mobile,
  gender, status, employment_status, date_of_joining,
  work_location, work_state, business_entity_id, department_id,
  designation_id, reporting_manager_id, onboarding_checklist
)
values
  -- manager / admin profiles
  ('13000000-0000-0000-0000-000000000001', 'EMP-MGR-001', 'Nora', 'Shaw', 'staging.manager.engineering@leadflow.test', '9000001001', '9000001001', 'Female', 'active', 'active', '2022-02-01', 'office', 'Karnataka', '10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000003', null, '[{"id":"contract","title":"Sign Employment Contract","status":"completed","type":"send_doc"}]'::jsonb),
  ('13000000-0000-0000-0000-000000000002', 'EMP-MGR-002', 'Rahul', 'Dev', 'staging.manager.operations@leadflow.test', '9000001002', '9000001002', 'Male', 'active', 'active', '2021-07-15', 'office', 'Tamil Nadu', '10000000-0000-0000-0000-000000000002', '11000000-0000-0000-0000-000000000004', '12000000-0000-0000-0000-000000000004', null, '[{"id":"contract","title":"Sign Employment Contract","status":"completed","type":"send_doc"}]'::jsonb),
  ('13000000-0000-0000-0000-000000000003', 'EMP-HRADM-01', 'Ava', 'Admin', 'staging.hradmin@leadflow.test', '9000001003', '9000001003', 'Female', 'active', 'active', '2020-04-01', 'office', 'Karnataka', '10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000001', null, '[{"id":"contract","title":"Sign Employment Contract","status":"completed","type":"send_doc"}]'::jsonb),
  ('13000000-0000-0000-0000-000000000004', 'EMP-HREXC-01', 'Ethan', 'Exec', 'staging.hrexec@leadflow.test', '9000001004', '9000001004', 'Male', 'active', 'active', '2021-01-01', 'office', 'Karnataka', '10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000001', '12000000-0000-0000-0000-000000000002', '13000000-0000-0000-0000-000000000003', '[{"id":"contract","title":"Sign Employment Contract","status":"completed","type":"send_doc"}]'::jsonb),
  ('13000000-0000-0000-0000-000000000005', 'EMP-SELF-001', 'Emma', 'Employee', 'staging.employee@leadflow.test', '9000001005', '9000001005', 'Female', 'active', 'active', '2023-06-01', 'remote', 'Karnataka', '10000000-0000-0000-0000-000000000001', '11000000-0000-0000-0000-000000000003', '12000000-0000-0000-0000-000000000005', '13000000-0000-0000-0000-000000000001', '[{"id":"contract","title":"Sign Employment Contract","status":"completed","type":"send_doc"}]'::jsonb)
on conflict (id) do update
set employee_code = excluded.employee_code,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    email = excluded.email,
    phone = excluded.phone,
    mobile = excluded.mobile,
    gender = excluded.gender,
    status = excluded.status,
    employment_status = excluded.employment_status,
    date_of_joining = excluded.date_of_joining,
    work_location = excluded.work_location,
    work_state = excluded.work_state,
    business_entity_id = excluded.business_entity_id,
    department_id = excluded.department_id,
    designation_id = excluded.designation_id,
    reporting_manager_id = excluded.reporting_manager_id,
    onboarding_checklist = excluded.onboarding_checklist;

-- Generate additional 24 employees for broad testing coverage
with base as (
  select gs as n
  from generate_series(1, 24) gs
), payload as (
  select
    ('14000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid as id,
    ('EMP-TST-' || lpad(n::text, 3, '0')) as employee_code,
    ('Test' || n::text) as first_name,
    case when mod(n, 2) = 0 then 'Engineer' else 'Operator' end as last_name,
    ('staging.employee' || lpad(n::text, 2, '0') || '@leadflow.test') as email,
    ('9000002' || lpad(n::text, 3, '0')) as phone,
    case when n <= 20 then 'active' else 'onboarding' end as status,
    case when n <= 20 then 'active' else 'onboarding' end as employment_status,
    (current_date - ((120 - n))::int) as date_of_joining,
    case when mod(n, 3) = 0 then 'remote' else 'office' end as work_location,
    case when mod(n, 2) = 0 then 'Karnataka' else 'Tamil Nadu' end as work_state,
    case when mod(n, 2) = 0 then '10000000-0000-0000-0000-000000000001'::uuid else '10000000-0000-0000-0000-000000000002'::uuid end as business_entity_id,
    case
      when mod(n, 2) = 0 then '11000000-0000-0000-0000-000000000003'::uuid
      when mod(n, 3) = 0 then '11000000-0000-0000-0000-000000000005'::uuid
      else '11000000-0000-0000-0000-000000000004'::uuid
    end as department_id,
    case
      when mod(n, 2) = 0 then '12000000-0000-0000-0000-000000000005'::uuid
      when mod(n, 3) = 0 then '12000000-0000-0000-0000-000000000007'::uuid
      else '12000000-0000-0000-0000-000000000006'::uuid
    end as designation_id,
    case when mod(n, 2) = 0 then '13000000-0000-0000-0000-000000000001'::uuid else '13000000-0000-0000-0000-000000000002'::uuid end as reporting_manager_id
  from base
)
insert into public.employees (
  id, employee_code, first_name, last_name, email, phone, mobile,
  status, employment_status, date_of_joining, work_location, work_state,
  business_entity_id, department_id, designation_id, reporting_manager_id, onboarding_checklist
)
select
  p.id,
  p.employee_code,
  p.first_name,
  p.last_name,
  p.email,
  p.phone,
  p.phone,
  p.status,
  p.employment_status,
  p.date_of_joining,
  p.work_location,
  p.work_state,
  p.business_entity_id,
  p.department_id,
  p.designation_id,
  p.reporting_manager_id,
  case
    when p.status = 'active' then '[{"id":"contract","title":"Sign Employment Contract","status":"completed","type":"send_doc"}]'::jsonb
    else '[{"id":"contract","title":"Sign Employment Contract","status":"action_required","type":"send_doc"}]'::jsonb
  end
from payload p
on conflict (id) do update
set employee_code = excluded.employee_code,
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    email = excluded.email,
    phone = excluded.phone,
    mobile = excluded.mobile,
    status = excluded.status,
    employment_status = excluded.employment_status,
    date_of_joining = excluded.date_of_joining,
    work_location = excluded.work_location,
    work_state = excluded.work_state,
    business_entity_id = excluded.business_entity_id,
    department_id = excluded.department_id,
    designation_id = excluded.designation_id,
    reporting_manager_id = excluded.reporting_manager_id,
    onboarding_checklist = excluded.onboarding_checklist;

-- ---------------------------------------------------------------------
-- 4) User role mapping (requires real auth.users IDs)
-- ---------------------------------------------------------------------
-- Replace the UUIDs below with real auth user IDs for your staging users.
-- You can fetch from Supabase Auth Users list.

-- Example placeholders (edit before running):
-- HR Admin user id
-- HR Executive user id
-- Employee user id

-- insert into public.user_roles (user_id, role)
-- values
--   ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'HR Admin'),
--   ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'HR Executive'),
--   ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Employee')
-- on conflict (user_id) do update set role = excluded.role;

-- ---------------------------------------------------------------------
-- 5) Attendance records (last 14 days for first 20 active users)
-- ---------------------------------------------------------------------
with selected_employees as (
  select id
  from public.employees
  where status in ('active', 'onboarding')
  order by created_at nulls last, id
  limit 20
), dates as (
  select (current_date - offs)::date as d
  from generate_series(1, 14) offs
), payload as (
  select
    se.id as employee_id,
    d.d as date,
    case when extract(isodow from d.d) in (6,7) then 'absent' else 'present' end as status
  from selected_employees se
  cross join dates d
)
insert into public.attendance_records (employee_id, date, status, updated_at)
select employee_id, date, status, now()
from payload
on conflict (employee_id, date) do update
set status = excluded.status,
    updated_at = excluded.updated_at;

-- ---------------------------------------------------------------------
-- 6) Leave requests (pending requests for testing)
-- ---------------------------------------------------------------------
with selected_employees as (
  select id, row_number() over(order by id) as rn
  from public.employees
  where status in ('active', 'onboarding')
  order by id
  limit 8
), payload as (
  select
    id as employee_id,
    'casual'::text as leave_type,
    (current_date + rn)::date as start_date,
    (current_date + rn + 1)::date as end_date,
    2::int as days_count,
    'pending'::text as status
  from selected_employees
)
insert into public.leave_requests (employee_id, leave_type, start_date, end_date, days_count, status)
select p.employee_id, p.leave_type, p.start_date, p.end_date, p.days_count, p.status
from payload p
where not exists (
  select 1
  from public.leave_requests lr
  where lr.employee_id = p.employee_id
    and lr.leave_type = p.leave_type
    and lr.start_date = p.start_date
    and lr.end_date = p.end_date
);

-- ---------------------------------------------------------------------
-- 7) Payroll runs + line items for reports/PF testing
-- ---------------------------------------------------------------------
insert into public.payroll_runs (id, period_month, period_year, status, created_at, finalized_at)
values
  ('15000000-0000-0000-0000-000000000001', extract(month from current_date)::int, extract(year from current_date)::int, 'finalized', now() - interval '2 day', now() - interval '1 day'),
  ('15000000-0000-0000-0000-000000000002', extract(month from (current_date - interval '1 month'))::int, extract(year from (current_date - interval '1 month'))::int, 'paid', now() - interval '35 day', now() - interval '34 day')
on conflict (id) do update
set period_month = excluded.period_month,
    period_year = excluded.period_year,
    status = excluded.status,
    finalized_at = excluded.finalized_at;

with selected_employees as (
  select id, row_number() over(order by id) as rn
  from public.employees
  where status = 'active'
  order by id
  limit 15
), payload as (
  select
    ('16000000-0000-0000-0000-' || lpad(rn::text, 12, '0'))::uuid as id,
    '15000000-0000-0000-0000-000000000001'::uuid as payroll_run_id,
    id as employee_id,
    (50000 + rn * 1000)::numeric as gross_earnings,
    1800::numeric as pf_employee,
    1800::numeric as pf_employer,
    375::numeric as esi_employee,
    200::numeric as professional_tax,
    0::numeric as lwf_employee,
    2500::numeric as tds,
    (50000 + rn * 1000 - 1800 - 375 - 200 - 2500)::numeric as net_pay
  from selected_employees
  union all
  select
    ('17000000-0000-0000-0000-' || lpad(rn::text, 12, '0'))::uuid as id,
    '15000000-0000-0000-0000-000000000002'::uuid as payroll_run_id,
    id as employee_id,
    (48000 + rn * 900)::numeric as gross_earnings,
    1800::numeric as pf_employee,
    1800::numeric as pf_employer,
    360::numeric as esi_employee,
    200::numeric as professional_tax,
    0::numeric as lwf_employee,
    2300::numeric as tds,
    (48000 + rn * 900 - 1800 - 360 - 200 - 2300)::numeric as net_pay
  from selected_employees
)
insert into public.payroll_line_items (
  id, payroll_run_id, employee_id, gross_earnings,
  pf_employee, pf_employer, esi_employee,
  professional_tax, lwf_employee, tds, net_pay, created_at
)
select
  p.id, p.payroll_run_id, p.employee_id, p.gross_earnings,
  p.pf_employee, p.pf_employer, p.esi_employee,
  p.professional_tax, p.lwf_employee, p.tds, p.net_pay, now()
from payload p
on conflict (id) do update
set payroll_run_id = excluded.payroll_run_id,
    employee_id = excluded.employee_id,
    gross_earnings = excluded.gross_earnings,
    pf_employee = excluded.pf_employee,
    pf_employer = excluded.pf_employer,
    esi_employee = excluded.esi_employee,
    professional_tax = excluded.professional_tax,
    lwf_employee = excluded.lwf_employee,
    tds = excluded.tds,
    net_pay = excluded.net_pay;

-- ---------------------------------------------------------------------
-- 8) PF statutory registrations for coverage metrics
-- ---------------------------------------------------------------------
with selected_employees as (
  select id, row_number() over(order by id) as rn
  from public.employees
  where status = 'active'
  order by id
  limit 20
)
insert into public.statutory_registrations (employee_id, registration_type, registration_number, is_applicable)
select
  id,
  'PF',
  ('PFNO' || lpad(rn::text, 6, '0')),
  true
from selected_employees
on conflict (employee_id, registration_type) do update
set registration_number = excluded.registration_number,
    is_applicable = excluded.is_applicable;

commit;

-- Post-seed smoke helpers:
-- select count(*) from public.employees;
-- select count(*) from public.attendance_records where date >= current_date - 14;
-- select count(*) from public.leave_requests where status = 'pending';
-- select count(*) from public.payroll_runs;
-- select count(*) from public.payroll_line_items;
