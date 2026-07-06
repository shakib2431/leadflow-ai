-- Phase 10: Reporting center export lifecycle support

begin;

create table if not exists public.hrms_report_exports (
  id uuid primary key default gen_random_uuid(),
  report_type text not null,
  section text not null,
  format text not null check (format in ('csv', 'json', 'pdf')),
  period_month int not null check (period_month between 1 and 12),
  period_year int not null check (period_year between 2000 and 2100),
  requested_by text,
  filters jsonb not null default '{}'::jsonb,
  status text not null default 'completed' check (status in ('queued', 'completed', 'failed')),
  created_at timestamptz not null default now()
);

create index if not exists idx_hrms_report_exports_period
  on public.hrms_report_exports (period_year desc, period_month desc, report_type, section);

create index if not exists idx_hrms_report_exports_requested_by
  on public.hrms_report_exports (requested_by, created_at desc);

commit;
