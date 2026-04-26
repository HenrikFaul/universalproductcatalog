create extension if not exists pgcrypto;

create table if not exists public.upc_catalogs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  industry text not null,
  description text not null default '',
  tmf_version text not null default 'TMF620 v4/v5 aligned logical structure',
  source_kind text not null default 'custom',
  catalog jsonb not null default '{}'::jsonb,
  product_specifications jsonb not null default '[]'::jsonb,
  product_offerings jsonb not null default '[]'::jsonb,
  service_specifications jsonb not null default '[]'::jsonb,
  resource_specifications jsonb not null default '[]'::jsonb,
  characteristic_definitions jsonb not null default '[]'::jsonb,
  hierarchy jsonb not null default '[]'::jsonb,
  service_mapping jsonb not null default '[]'::jsonb,
  tmf620_examples jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.upc_catalogs_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_upc_catalogs_touch_updated_at on public.upc_catalogs;
create trigger trg_upc_catalogs_touch_updated_at
before update on public.upc_catalogs
for each row execute function public.upc_catalogs_touch_updated_at();

create index if not exists idx_upc_catalogs_industry on public.upc_catalogs (industry);
create index if not exists idx_upc_catalogs_source_kind on public.upc_catalogs (source_kind);
