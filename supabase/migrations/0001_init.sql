-- ARCANA · esquema inicial
-- Ejecutar entero en Supabase → SQL Editor → New query.
--
-- Modelo de permisos (decidido para esta mesa): TODOS los usuarios autenticados
-- tienen los mismos permisos sobre todas las fichas —ver, editar y borrar—.
-- Es lo que se quiere para una party donde todo el mundo se fía del resto.
-- Al final del archivo están, comentadas, las políticas estrictas por dueño
-- por si algún día se quiere cerrar.

create extension if not exists pgcrypto;

create table if not exists public.characters (
  id         uuid primary key default gen_random_uuid(),
  -- Quién creó la ficha. Se guarda como información, no restringe el acceso.
  owner_id   uuid references auth.users (id) on delete set null,
  -- Nombre desnormalizado: permite listar y ordenar sin abrir el jsonb.
  name       text not null default 'Sin nombre',
  -- La ficha completa. El modelo vive en src/types/character.ts y evoluciona
  -- sin necesidad de migrar columnas.
  data       jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists characters_owner_idx on public.characters (owner_id);
create index if not exists characters_created_idx on public.characters (created_at);

-- updated_at siempre al día, lo toque quien lo toque.
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

-- ── Permisos ───────────────────────────────────────────────────────────────
alter table public.characters enable row level security;

drop policy if exists "party lee todas las fichas"     on public.characters;
drop policy if exists "party crea fichas"              on public.characters;
drop policy if exists "party edita todas las fichas"   on public.characters;
drop policy if exists "party borra todas las fichas"   on public.characters;

create policy "party lee todas las fichas"
  on public.characters for select
  to authenticated
  using (true);

create policy "party crea fichas"
  on public.characters for insert
  to authenticated
  with check (true);

create policy "party edita todas las fichas"
  on public.characters for update
  to authenticated
  using (true)
  with check (true);

create policy "party borra todas las fichas"
  on public.characters for delete
  to authenticated
  using (true);

-- Nadie sin sesión toca nada: no hay ninguna política para el rol `anon`.

-- ── Para cerrar los permisos más adelante ──────────────────────────────────
-- Borra las cuatro políticas de arriba y deja solo estas dos:
--
--   create policy "cada cual gestiona su ficha"
--     on public.characters for all to authenticated
--     using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
--
--   create policy "la party puede leer"
--     on public.characters for select to authenticated using (true);
