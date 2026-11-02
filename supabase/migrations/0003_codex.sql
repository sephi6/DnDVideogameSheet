-- ARCANA · codex (shared journal of NPCs, places, factions, creatures, lore)
-- Run after 0001_init.sql and 0002_quests.sql in Supabase → SQL Editor. Safe to run again.
--
-- Same permission model as characters and quests: every authenticated user can
-- read, create, edit and delete every entry; anon has no policy. Images live in
-- the public-read Storage bucket "codex"; only authenticated users write to it.

create table if not exists public.codex_entries (
  id          uuid primary key default gen_random_uuid(),
  kind        text not null check (kind in ('npc', 'place', 'faction', 'creature', 'lore')),
  name        text not null default '',
  subtitle    text not null default '',
  attitude    text check (attitude in ('ally', 'neutral', 'hostile', 'unknown')),
  status      text,
  image       text,
  notes       text not null default '',
  related     uuid[] not null default '{}',
  details     jsonb not null default '{}',
  added_by    uuid references public.characters (id) on delete set null,
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists codex_entries_kind_idx on public.codex_entries (kind);

-- updated_at (the function comes from 0001_init.sql).
drop trigger if exists codex_entries_touch_updated_at on public.codex_entries;
create trigger codex_entries_touch_updated_at before update on public.codex_entries
  for each row execute function public.touch_updated_at();

-- ── Permissions ────────────────────────────────────────────────────────────
alter table public.codex_entries enable row level security;

drop policy if exists "party reads codex_entries" on public.codex_entries;
drop policy if exists "party creates codex_entries" on public.codex_entries;
drop policy if exists "party edits codex_entries" on public.codex_entries;
drop policy if exists "party deletes codex_entries" on public.codex_entries;
create policy "party reads codex_entries" on public.codex_entries for select to authenticated using (true);
create policy "party creates codex_entries" on public.codex_entries for insert to authenticated with check (true);
create policy "party edits codex_entries" on public.codex_entries for update to authenticated using (true) with check (true);
create policy "party deletes codex_entries" on public.codex_entries for delete to authenticated using (true);

-- ── Realtime ───────────────────────────────────────────────────────────────
-- Deletes must carry the whole old row, or the client cannot tell which entry went away.
alter table public.codex_entries replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'codex_entries'
  ) then
    alter publication supabase_realtime add table public.codex_entries;
  end if;
end $$;

-- ── Storage: codex images ──────────────────────────────────────────────────
-- Public read (object names are random UUIDs), so images load with a plain URL
-- and cache well. Writes need a signed-in user; Storage remove() and update() also need a select policy.
insert into storage.buckets (id, name, public)
values ('codex', 'codex', true)
on conflict (id) do nothing;

drop policy if exists "party reads codex images" on storage.objects;
drop policy if exists "party uploads codex images" on storage.objects;
drop policy if exists "party replaces codex images" on storage.objects;
drop policy if exists "party deletes codex images" on storage.objects;
create policy "party reads codex images" on storage.objects
  for select to authenticated using (bucket_id = 'codex');
create policy "party uploads codex images" on storage.objects
  for insert to authenticated with check (bucket_id = 'codex');
create policy "party replaces codex images" on storage.objects
  for update to authenticated using (bucket_id = 'codex') with check (bucket_id = 'codex');
create policy "party deletes codex images" on storage.objects
  for delete to authenticated using (bucket_id = 'codex');
