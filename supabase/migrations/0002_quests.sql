-- ARCANA · quest log (spec 3)
-- Run after 0001_init.sql in Supabase → SQL Editor. Safe to run again.
--
-- Same permission model as characters: every authenticated user can read,
-- create, edit and delete every quest; anon has no policy.

create table if not exists public.quests (
  id                uuid primary key default gen_random_uuid(),
  scope             text not null check (scope in ('group', 'personal')),
  status            text not null default 'active' check (status in ('active', 'completed', 'failed')),
  title             text not null default 'New quest',
  description       text not null default '',
  giver             text not null default '',
  location          text not null default '',
  recommended_level int  check (recommended_level between 1 and 20),
  reward_coins      jsonb not null default '{"pp":0,"gp":0,"ep":0,"sp":0,"cp":0}',
  reward_xp         int  not null default 0 check (reward_xp >= 0),
  reward_items      text[] not null default '{}',
  created_by        uuid default auth.uid() references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.quest_objectives (
  id         uuid primary key default gen_random_uuid(),
  quest_id   uuid not null references public.quests (id) on delete cascade,
  position   int  not null default 0,
  text       text not null default '',
  target     int  not null default 1 check (target between 1 and 999),
  progress   int  not null default 0 check (progress >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.quest_participants (
  quest_id     uuid not null references public.quests (id) on delete cascade,
  character_id uuid not null references public.characters (id) on delete cascade,
  joined       boolean not null default true,
  tracked      boolean not null default true,
  updated_at   timestamptz not null default now(),
  primary key (quest_id, character_id)
);

create index if not exists quest_objectives_quest_idx on public.quest_objectives (quest_id);
create index if not exists quest_participants_character_idx on public.quest_participants (character_id);

-- updated_at (the function comes from 0001_init.sql).
drop trigger if exists quests_touch_updated_at on public.quests;
create trigger quests_touch_updated_at before update on public.quests
  for each row execute function public.touch_updated_at();
drop trigger if exists quest_objectives_touch_updated_at on public.quest_objectives;
create trigger quest_objectives_touch_updated_at before update on public.quest_objectives
  for each row execute function public.touch_updated_at();
drop trigger if exists quest_participants_touch_updated_at on public.quest_participants;
create trigger quest_participants_touch_updated_at before update on public.quest_participants
  for each row execute function public.touch_updated_at();

-- ── Permissions ────────────────────────────────────────────────────────────
alter table public.quests             enable row level security;
alter table public.quest_objectives   enable row level security;
alter table public.quest_participants enable row level security;

do $$
declare t text;
begin
  foreach t in array array['quests', 'quest_objectives', 'quest_participants'] loop
    execute format('drop policy if exists "party reads %1$s" on public.%1$I', t);
    execute format('drop policy if exists "party creates %1$s" on public.%1$I', t);
    execute format('drop policy if exists "party edits %1$s" on public.%1$I', t);
    execute format('drop policy if exists "party deletes %1$s" on public.%1$I', t);
    execute format('create policy "party reads %1$s" on public.%1$I for select to authenticated using (true)', t);
    execute format('create policy "party creates %1$s" on public.%1$I for insert to authenticated with check (true)', t);
    execute format('create policy "party edits %1$s" on public.%1$I for update to authenticated using (true) with check (true)', t);
    execute format('create policy "party deletes %1$s" on public.%1$I for delete to authenticated using (true)', t);
  end loop;
end $$;

-- ── Realtime ───────────────────────────────────────────────────────────────
-- Deletes must carry the whole old row, or the client cannot tell which
-- objective or participant went away.
alter table public.quests             replica identity full;
alter table public.quest_objectives   replica identity full;
alter table public.quest_participants replica identity full;

do $$
declare t text;
begin
  foreach t in array array['quests', 'quest_objectives', 'quest_participants'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
