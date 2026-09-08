-- ARCANA · initial schema
-- Run the whole file in Supabase → SQL Editor → New query.
--
-- Permission model (decided for this table): ALL authenticated users have the
-- same rights over every sheet —read, edit and delete—. That is what a party
-- where everyone trusts each other wants. At the end of the file, commented
-- out, are the strict per-owner policies in case it ever needs locking down.

create extension if not exists pgcrypto;

create table if not exists public.characters (
  id         uuid primary key default gen_random_uuid(),
  -- Who created the sheet. Stored as information, it does not restrict access.
  owner_id   uuid references auth.users (id) on delete set null,
  -- Denormalized name: allows listing and sorting without opening the jsonb.
  name       text not null default 'Unnamed',
  -- The whole sheet. The model lives in src/types/character.ts and evolves
  -- without needing column migrations.
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists characters_owner_idx on public.characters (owner_id);
create index if not exists characters_created_idx on public.characters (created_at);

-- updated_at always current, no matter who touches the row.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists characters_touch_updated_at on public.characters;
create trigger characters_touch_updated_at
  before update on public.characters
  for each row execute function public.touch_updated_at();

-- ── Permissions ────────────────────────────────────────────────────────────
alter table public.characters enable row level security;

-- Previous names of these policies (Spanish), dropped so the file stays
-- re-runnable on a database created before the rename.
drop policy if exists "party lee todas las fichas"     on public.characters;
drop policy if exists "party crea fichas"              on public.characters;
drop policy if exists "party edita todas las fichas"   on public.characters;
drop policy if exists "party borra todas las fichas"   on public.characters;

drop policy if exists "party reads every sheet"   on public.characters;
drop policy if exists "party creates sheets"      on public.characters;
drop policy if exists "party edits every sheet"   on public.characters;
drop policy if exists "party deletes every sheet" on public.characters;

create policy "party reads every sheet"
  on public.characters for select
  to authenticated
  using (true);

create policy "party creates sheets"
  on public.characters for insert
  to authenticated
  with check (true);

create policy "party edits every sheet"
  on public.characters for update
  to authenticated
  using (true)
  with check (true);

create policy "party deletes every sheet"
  on public.characters for delete
  to authenticated
  using (true);

-- Nobody without a session touches anything: the `anon` role has no policy.

-- ── To lock the permissions down later ─────────────────────────────────────
-- Drop the four policies above and keep only these two:
--
--   create policy "everyone manages their own sheet"
--     on public.characters for all to authenticated
--     using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
--
--   create policy "the party can read"
--     on public.characters for select to authenticated using (true);
