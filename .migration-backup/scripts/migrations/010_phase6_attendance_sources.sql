-- Phase 6: Biometric and online attendance source integration foundation

create table if not exists public.attendance_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  provider text not null,
  status text not null default 'active',
  config jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_sources_provider_check check (provider in ('manual', 'biometric_csv', 'biometric_api')),
  constraint attendance_sources_status_check check (status in ('active', 'inactive'))
);

create index if not exists idx_attendance_sources_provider_status
  on public.attendance_sources(provider, status);

create table if not exists public.attendance_sync_logs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.attendance_sources(id) on delete cascade,
  sync_date date not null,
  status text not null,
  total_records integer not null default 0,
  created_records integer not null default 0,
  updated_records integer not null default 0,
  error_message text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint attendance_sync_logs_status_check check (status in ('success', 'failed')),
  constraint attendance_sync_logs_non_negative_counts check (
    total_records >= 0 and created_records >= 0 and updated_records >= 0
  )
);

create index if not exists idx_attendance_sync_logs_source_created
  on public.attendance_sync_logs(source_id, created_at desc);

create index if not exists idx_attendance_sync_logs_sync_date
  on public.attendance_sync_logs(sync_date desc);
