# Plan de integración con Supabase

El MVP guarda en `localStorage`. Todo el acceso a datos pasa por un único
adaptador (`src/lib/storage.ts`), así que conectar Supabase es sustituir esa
implementación sin tocar pantallas ni secciones.

## 1. Esquema propuesto

```sql
-- Personajes. La ficha entera viaja como jsonb: el modelo de datos vive en
-- src/types/character.ts y evoluciona sin migraciones de columnas.
create table public.characters (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  campaign_id uuid references public.campaigns (id) on delete set null,
  name        text not null default 'Sin nombre',
  data        jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index characters_owner_idx on public.characters (owner_id);

-- Partidas, para que un DM vea las fichas de su mesa.
create table public.campaigns (
  id       uuid primary key default gen_random_uuid(),
  dm_id    uuid not null references auth.users (id) on delete cascade,
  name     text not null,
  join_code text unique not null
);

create table public.campaign_members (
  campaign_id uuid references public.campaigns (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete cascade,
  primary key (campaign_id, user_id)
);
```

## 2. Políticas RLS

```sql
alter table public.characters enable row level security;

create policy "el dueño gestiona su ficha"
  on public.characters for all
  using (auth.uid() = owner_id)
  with check (auth.uid() = owner_id);

create policy "el DM lee las fichas de su partida"
  on public.characters for select
  using (
    campaign_id in (select id from public.campaigns where dm_id = auth.uid())
  );
```

## 3. Adaptador

```ts
// src/lib/storage.supabase.ts
import { createClient } from '@supabase/supabase-js'
import type { StorageAdapter } from './storage'

const client = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

export const supabaseAdapter: StorageAdapter = {
  name: 'supabase',
  async load() {
    const { data, error } = await client.from('characters').select('data')
    if (error) throw error
    return (data ?? []).map((row) => row.data)
  },
  async saveAll(characters) {
    const { data: session } = await client.auth.getUser()
    const owner = session.user?.id
    if (!owner) return
    await client.from('characters').upsert(
      characters.map((c) => ({
        id: c.id,
        owner_id: owner,
        name: c.identity.name,
        data: c,
        updated_at: new Date().toISOString(),
      })),
    )
  },
}
```

Después basta con cambiar la última línea de `src/lib/storage.ts`:

```ts
export const storage: StorageAdapter = supabaseAdapter
```

> `saveAll` es suficiente para el MVP, pero conviene pasar a guardar por
> personaje (`upsert` de una fila) en cuanto haya varias mesas: el store ya
> sabe qué ficha ha cambiado en `updateCharacter`.

## 4. Autenticación

1. Habilitar **Magic Link** (correo) y, si se quiere, Discord como proveedor OAuth
   —es lo que ya usa la mayoría de mesas—.
2. Añadir una pantalla `LoginScreen` antes de `CharacterSelect`, con la misma
   estética de menú (`title-mark` + campo de correo).
3. `App.tsx` decide: sin sesión → login; con sesión → `hydrate()`.

## 5. Variables de entorno

```bash
# .env.local  (nunca se commitea)
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<clave anon pública>
```

La clave `service_role` **no** debe aparecer en el frontend.

## 6. Retratos en Storage

Bucket `portraits`, público de lectura y escritura solo para el dueño:

```sql
create policy "sube su propio retrato"
  on storage.objects for insert
  with check (bucket_id = 'portraits' and auth.uid()::text = (storage.foldername(name))[1]);
```

El botón **Subir** de la sección Identidad pasaría de guardar un data-url a
subir el archivo y guardar la URL pública en `identity.portrait`.

## 7. Tiempo real (opcional, más adelante)

`supabase.channel('characters')` con `postgres_changes` permite que el DM vea
los puntos de golpe de la party actualizarse en directo durante la sesión.
