-- Phase 9: PF management module support

begin;

create table if not exists public.pf_return_filings (
  id uuid primary key default gen_random_uuid(),
  period_month int not null check (period_month between 1 and 12),
  period_year int not null check (period_year between 2000 and 2100),
  filing_status text not null default 'draft' check (filing_status in ('draft', 'generated', 'filed', 'reconciled')),
  generated_on timestamptz,
  filed_on timestamptz,
  challan_reference text,
  notes text,
  totals jsonb not null default '{}'::jsonb,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (period_month, period_year)
);

create index if not exists idx_pf_return_filings_period
  on public.pf_return_filings (period_year desc, period_month desc, filing_status);

create index if not exists idx_payroll_line_items_pf_period
  on public.payroll_line_items (employee_id, payroll_run_id, pf_employee, pf_employer);

commit;
