-- Phase 8: Payroll lifecycle + reporting support
-- Safe indexes and constraints for salary structure versioning and payroll reporting throughput

begin;

-- Ensure only one active salary structure per employee
create unique index if not exists idx_salary_structures_one_active
  on public.salary_structures (employee_id)
  where effective_to is null;

-- Salary structure lifecycle query acceleration
create index if not exists idx_salary_structures_employee_effective
  on public.salary_structures (employee_id, effective_from desc, effective_to);

create index if not exists idx_salary_components_structure
  on public.salary_components (salary_structure_id);

-- Payroll runs/reporting acceleration
create index if not exists idx_payroll_runs_period_status
  on public.payroll_runs (period_year desc, period_month desc, status);

create index if not exists idx_payroll_line_items_run_employee
  on public.payroll_line_items (payroll_run_id, employee_id);

commit;
