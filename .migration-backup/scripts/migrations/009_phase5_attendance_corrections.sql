-- Phase 5: Attendance correction workflow

create table if not exists public.attendance_corrections (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  date date not null,
  current_status text,
  requested_status text not null,
  reason text not null,
  status text not null default 'pending',
  requested_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_corrections_requested_status_check check (requested_status in ('present', 'absent', 'half_day')),
  constraint attendance_corrections_status_check check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists idx_attendance_corrections_employee_date
  on public.attendance_corrections(employee_id, date desc);

create index if not exists idx_attendance_corrections_status
  on public.attendance_corrections(status, created_at desc);