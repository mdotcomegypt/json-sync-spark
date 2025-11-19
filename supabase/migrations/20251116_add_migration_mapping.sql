-- Enable required extension for UUID generation
create extension if not exists pgcrypto;

create table if not exists public.migration_mapping (
  id uuid primary key default gen_random_uuid(),

  -- Source system identifiers (e.g., AEM)
  source_system text not null,
  source_id text not null,

  -- Target system identifiers (e.g., Contentful)
  target_system text,
  target_id text,

  -- Domain details
  entity_type text not null,
  operation text not null,

  -- Lifecycle
  status text not null check (status in ('started','succeeded','failed','updated')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  duration_ms integer,

  -- Optional blob/payload and error
  payload jsonb,
  error_message text,

  -- Correlation
  trace_id text,

  -- Timestamps
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Idempotent unique constraint example (optional):
-- ensures only one active started record per source if required.
-- comment out if not needed.
-- create unique index if not exists migration_mapping_started_unique
--   on public.migration_mapping(source_system, source_id, status)
--   where status = 'started';

-- Helpful indexes
create index if not exists migration_mapping_source_idx on public.migration_mapping (source_system, source_id);
create index if not exists migration_mapping_trace_idx on public.migration_mapping (trace_id);
create index if not exists migration_mapping_status_idx on public.migration_mapping (status);
create index if not exists migration_mapping_entity_operation_idx on public.migration_mapping (entity_type, operation);
create index if not exists migration_mapping_started_at_idx on public.migration_mapping (started_at desc);

-- Trigger to keep updated_at fresh
create or replace function public.set_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_migration_mapping_timestamp on public.migration_mapping;
create trigger set_migration_mapping_timestamp
before update on public.migration_mapping
for each row execute function public.set_timestamp();

-- RLS (recommended for production)
alter table public.migration_mapping enable row level security;

-- Allow service role full access
drop policy if exists migration_mapping_service_role_all on public.migration_mapping;
create policy migration_mapping_service_role_all
  on public.migration_mapping
  for all
  using (true)
  with check (true);

-- Optionally allow authenticated users to read their own rows if you add a column owner_id uuid
-- and set it from auth.uid(). Keeping read restricted by default for safety.

comment on table public.migration_mapping is 'Tracks migration operations and their mapping between source and target systems.';
comment on column public.migration_mapping.source_system is 'Name of the source system (e.g., AEM).';
comment on column public.migration_mapping.target_system is 'Name of the target system (e.g., Contentful).';
