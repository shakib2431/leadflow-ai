-- Phase 7: Attendance exception detection and follow-up workflow

create table if not exists public.attendance_exceptions (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  date date not null,
  exception_type text not null,
  severity text not null default 'medium',
  status text not null default 'open',
  title text not null,
  description text,
  detected_from jsonb not null default '{}'::jsonb,
  resolution_note text,
  resolved_at timestamptz,
  resolved_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_exceptions_type_check check (exception_type in ('missing_attendance', 'unplanned_absence', 'pending_correction', 'repeated_absence')),
  constraint attendance_exceptions_severity_check check (severity in ('low', 'medium', 'high', 'critical')),
  constraint attendance_exceptions_status_check check (status in ('open', 'in_review', 'resolved', 'dismissed'))
);

create unique index if not exists uq_attendance_exceptions_employee_date_type
  on public.attendance_exceptions(employee_id, date, exception_type);

create index if not exists idx_attendance_exceptions_status_date
  on public.attendance_exceptions(status, date desc);

create index if not exists idx_attendance_exceptions_severity
  on public.attendance_exceptions(severity, created_at desc);
