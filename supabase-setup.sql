-- Run this once in the Supabase SQL editor (valkorea project).
-- Creates the table that holds each trip plan, keyed by trip code.

create table if not exists public.trip_state (
  id          text primary key,                 -- the trip code (e.g. "K9X2Q7")
  data        jsonb not null default '{}'::jsonb, -- { selections, sliders }
  updated_at  timestamptz not null default now()
);

-- Row Level Security: the trip code itself is the shared secret, so allow
-- anonymous read/write. (Anyone who knows a code can read/write that one row.)
alter table public.trip_state enable row level security;

drop policy if exists "anon read"   on public.trip_state;
drop policy if exists "anon insert" on public.trip_state;
drop policy if exists "anon update" on public.trip_state;

create policy "anon read"   on public.trip_state for select using (true);
create policy "anon insert" on public.trip_state for insert with check (true);
create policy "anon update" on public.trip_state for update using (true) with check (true);

-- Enable realtime so other devices update live.
alter publication supabase_realtime add table public.trip_state;
