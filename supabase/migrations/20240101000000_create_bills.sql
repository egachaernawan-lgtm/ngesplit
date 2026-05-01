-- Bills table: stores the full bill JSON blob
create table if not exists public.bills (
  id          text primary key,
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Index for faster lookups on created_at (e.g. cleanup jobs)
create index if not exists bills_created_at_idx on public.bills (created_at desc);

-- Auto-update updated_at on upsert
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger bills_updated_at
  before update on public.bills
  for each row execute function public.set_updated_at();

-- Row-level security: anyone can read, anyone can insert/upsert
-- (bills are identified by nanoid — unguessable IDs act as access tokens)
alter table public.bills enable row level security;

create policy "Public read"
  on public.bills for select
  using (true);

create policy "Public insert"
  on public.bills for insert
  with check (true);

create policy "Public update"
  on public.bills for update
  using (true)
  with check (true);

-- Optional: auto-delete bills older than 30 days (requires pg_cron extension)
-- Uncomment if you have pg_cron enabled in your Supabase project
-- select cron.schedule(
--   'delete-old-bills',
--   '0 3 * * *',
--   $$ delete from public.bills where created_at < now() - interval '30 days' $$
-- );
