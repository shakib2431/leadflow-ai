-- Add note field to leave requests so employees can add a reason/remark

begin;

alter table public.leave_requests
  add column if not exists note text;

commit;
