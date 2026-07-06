-- Phase 11: Admin console hardening tables

begin;

create table if not exists public.hrms_admin_settings (
  id uuid primary key default gen_random_uuid(),
  settings jsonb not null default '{}'::jsonb,
  updated_by text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.hrms_role_permissions (
  id uuid primary key default gen_random_uuid(),
  role text not null,
  permission_key text not null,
  is_allowed boolean not null default true,
  updated_by text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (role, permission_key)
);

create table if not exists public.hrms_backup_configs (
  id uuid primary key default gen_random_uuid(),
  config jsonb not null default '{}'::jsonb,
  updated_by text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.hrms_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null,
  entity_id text,
  actor_id text,
  actor_email text,
  actor_role text,
  request_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_hrms_audit_logs_created_at
  on public.hrms_audit_logs (created_at desc);

create index if not exists idx_hrms_audit_logs_action
  on public.hrms_audit_logs (action, entity_type);

commit;
