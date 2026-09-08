# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

**ARCANA** — app web para llevar la ficha de un personaje de **D&D 2024**. El objetivo de
diseño no es la ficha en sí, sino **navegarla como el menú de un videojuego** (referencia
declarada: Persona 5): cartas inclinadas, barrido rojo diagonal entre pantallas, blips de
menú sintetizados y navegación con teclado.

**Dos modos, decididos solos** (`src/lib/supabase.ts` → `isSupabaseConfigured`):
- **Local** — sin `.env.local`. Guarda en `localStorage`, sin login.
- **Nube** — con `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` (o el nombre antiguo
  `VITE_SUPABASE_ANON_KEY`) en `.env.local`. Pide login y lee/escribe en Supabase (tabla
  `characters`, ficha entera como `jsonb`).

## Idioma

Todo el proyecto está en **español**: UI, comentarios, nombres de dominio (las clases se
guardan por su nombre visible — `'Mago'`, `'Bárbaro'`), mensajes de commit. Sigue esa
convención al añadir código.

## Comandos

```bash
npm run dev        # Vite dev server en http://localhost:5173
npm run build      # tsc -b (typecheck estricto) + vite build  ← única puerta de calidad
npm run preview     # sirve el build de dist/
npm run typecheck  # solo tipos

node scripts/generate-seed.mjs     # regenera supabase/seed.sql desde src/data/defaults.ts (usa esbuild, viene con Vite)
node scripts/generate-assets.mjs   # regenera los retratos-emblema SVG de public/assets/portraits/
bash scripts/fetch-fonts.sh        # regenera las fuentes auto-alojadas de public/fonts/
```

No hay tests ni ESLint configurados. `tsc -b` corre en modo `strict` con `noUnusedLocals`
y `noUnusedParameters`, así que una variable sin usar rompe el build.

Tras un `git pull` que cambie `package.json`, **corre `npm install`**: `@supabase/supabase-js`
se añadió con la integración de Supabase y sin él el typecheck falla.

Alias de imports: `@/` → `src/` (definido en `vite.config.ts` y `tsconfig.app.json`).

## Arquitectura

**Sin router.** `src/App.tsx` es una máquina de estados de tres pantallas
(`'title' | 'select' | 'sheet'`) más una puerta de login. `needsLogin` (auth activo y sin
sesión) mete `LoginScreen` por encima de `select`/`sheet`. `App` llama a `hydrate()` cuando
`authStatus` es `'signed-in'` o `'disabled'`, y a `reset()` al cerrar sesión.

**Transiciones — `useWipe()` (`src/components/fx/Wipe.tsx`).** El barrido rojo cubre,
ejecuta el cambio de pantalla y descubre. El efecto de navegación vive en un `useEffect`
(fase `reveal`), **nunca dentro de un updater de `setState`**: StrictMode los invoca dos
veces y la acción se perdería. Con `prefers-reduced-motion` se omite el barrido; hay un
failsafe de 1,2 s por si la animación no avisa (pestaña en segundo plano). Mismo patrón en
el menú de secciones de `SheetScreen`.

**Estado de la party — `src/store/roster.ts` (zustand).** Fuente única de verdad del array
de personajes. Toda mutación va por `updateCharacter(id, draft => { ... })`: recibe un
`structuredClone` mutable, lo modificas libremente, el store fija `updatedAt`. Detalles:
- **Guardado por ficha, no por party.** `scheduleSave(id)` con debounce de 500 ms y **un
  temporizador por personaje** (`timers: Map`). Editar dos fichas no encola una detrás de otra.
- **Estado de sincronización** `sync: 'idle'|'saving'|'saved'|'error'` + `syncError`, que la
  cabecera de `SheetScreen` muestra. Los ids que fallan van a un `Set` `failed` y se
  reintentan con `retryFailed()`.
- **`hydrate()` está protegido contra doble ejecución** (promesa `hydration` en módulo):
  StrictMode montaba el efecto dos veces y sembraba la party de ejemplo por duplicado.
- **Siembra**: base vacía → `demoRoster()`. En local siempre; en la nube solo la primera vez
  (flag `arcana:cloud-seeded` en `localStorage`), para no resucitar ejemplos borrados.
- `pendingLocalImport` / `importLocalRoster()`: al pasar a la nube, ofrece subir las fichas
  que quedaron en `localStorage`. `seedDemo()`: botón manual de "cargar ejemplos".

**Persistencia — `src/lib/storage.ts`.** Interfaz `StorageAdapter` con métodos **por ficha**
(`load` / `save` / `saveMany` / `remove`) y dos implementaciones: `localAdapter` (clave
`arcana:roster:v1`) y `supabaseAdapter`. `export const storage` elige según
`isSupabaseConfigured`; `usingCloud` es el booleano derivado. Las pantallas hablan siempre
con `storage` y no saben cuál está activo. **El `Character` entero tiene que ser
serializable tal cual** (columna `data` `jsonb`); `id`, `name` y `owner_id` se desnormalizan
a columnas para poder listar desde SQL. El `id` de la fila manda sobre el que venga en el json.

**Auth — `src/store/auth.ts` (zustand) + `src/screens/LoginScreen.tsx`.** Correo+contraseña,
enlace mágico como alternativa, y cierre de sesión. `init()` lee la sesión guardada y se
suscribe a `onAuthStateChange` (devuelve la función de baja). `status` arranca en
`'disabled'` si no hay Supabase. Los errores de Supabase se traducen con `readableError()`
(`src/lib/supabase.ts`).

**Cliente Supabase — `src/lib/supabase.ts`.** `supabase` es `null` sin credenciales;
`requireSupabase()` lanza si se usa sin configurar. Tipos de `import.meta.env` en
`src/vite-env.d.ts`.

**Retratos subidos — `src/lib/image.ts`.** `downscaleImage()` reescala a 1000×1400 y
recomprime a WebP/JPEG antes de guardar: el retrato viaja como data-url dentro del `jsonb` y
una foto de varios MB engordaría la fila y se reenviaría entera en cada guardado.

**Modelo de datos — `src/types/character.ts`.** Una sola interfaz `Character` grande y
plana. Sin migraciones: el modelo evoluciona y el `jsonb` se adapta. `id` es un **UUID de
verdad** (`newId()` en `defaults.ts`), porque es la clave primaria de la tabla; `isUuid()`
detecta las fichas viejas con id `pc_xxx` para regenerarlas al importarlas a la nube.

**Datos de reglas — `src/data/`.**
- `rules.ts`: tablas estáticas de D&D 2024 (12 clases con dado de golpe/salvaciones/tipo de
  lanzador, 18 habilidades, tabla de espacios de conjuro de lanzador completo y de pacto,
  bonif. de competencia). `findClass(name)` resuelve por nombre visible.
- `defaults.ts`: `createCharacter(partial?)` (fábrica, Guerrero nivel 1 por defecto) y
  `demoRoster()` (4 personajes de ejemplo con **todas las secciones rellenas** — ataques,
  conjuros, equipo, rasgos, diario). El demo usa ids anidados deterministas (`${slug}-atk-1`)
  y `DEMO_TIMESTAMP` fijo para que `generate-seed.mjs` produzca un `seed.sql` estable.

**Valores derivados — `src/lib/derive.ts`.** Funciones puras (`mod`, `pb`, `saveBonus`,
`skillBonus`, `spellSaveDC`, `initiative`, `carryCapacity`…). **No se almacenan derivados**:
se calculan en render. Excepción deliberada: al cambiar clase o nivel en `IdentitySection`
se reescriben `combat.hitDieSize`, `combat.hitDiceTotal` y `spellcasting.slots`, porque
después son campos que el jugador edita a mano.

**Secciones de la ficha — `src/sections/`.** Ocho componentes
`({ character, update }: SectionProps) => JSX`. El orden, las teclas `1`–`8`, los glifos y
el registro están en el array `SECTIONS` de `src/screens/SheetScreen.tsx` — para
añadir/reordenar una sección se toca ahí.

**Primitivas de UI — `src/components/ui/controls.tsx`.** Todos los controles de formulario
(`TextField`, `NumberField`, `SelectField`, `Button`, `CheckBox`, `ProficiencyPip`, `Chip`…).
Cada control llama a `play(cue)` **por su cuenta**, así que las secciones no cablean sonido.

**Sonido — `src/lib/sfx.ts`.** Cues de menú sintetizados con WebAudio, cero archivos de
audio. Mute persistido en `arcana:sfx-muted`.

**Teclado.** Cada pantalla monta su propio listener `keydown` en `window` dentro de un
`useEffect`. Todos filtran con `isTyping(e.target)` (`src/lib/keys.ts`) para no secuestrar
la escritura en campos. Hay alias WASD/QE junto a las flechas.

**Estilos.** CSS plano en `src/styles/` (`fonts`, `global`, `screens`, `sheet`), importado
en `src/main.tsx`. La custom property `--accent` se fija por personaje (estilo inline en los
contenedores) y tiñe todo el menú.

## Assets

Los retratos de `public/assets/portraits/*.svg` son **emblemas provisionales generados por
código**. Sustituirlos por ilustraciones reales: guía de estilo y prompts en
`docs/ASSET_PROMPTS.md`. Si cambia la extensión (`.svg` → `.png`) hay que actualizarla en
dos sitios: `PORTRAIT_SLUGS` / `portraitForClass()` en `src/data/defaults.ts` y
`PORTRAIT_LIBRARY` en `src/sections/IdentitySection.tsx`. Las rutas de retrato son
**relativas** (`assets/portraits/…`, sin barra inicial).

## Supabase

Base de datos y migraciones en `supabase/` (no hay proyecto de Supabase CLI: no existe
`supabase/config.toml`). Guía completa: `docs/SUPABASE.md`.

- **`supabase/migrations/0001_init.sql`** — tabla `public.characters` (`id uuid pk`,
  `owner_id` → `auth.users`, `name text`, `data jsonb`, timestamps), índices, trigger
  `touch_updated_at`, y **RLS**: cualquier usuario `authenticated` puede leer/crear/editar/
  borrar *cualquier* ficha (party donde todos se fían); `anon` no tiene ninguna política.
  Al final, comentadas, las políticas estrictas por dueño.
- **`supabase/seed.sql`** — la party de ejemplo con ids UUID fijos, `on conflict do nothing`.
  **Generado** por `node scripts/generate-seed.mjs` desde `src/data/defaults.ts` (esbuild
  empaqueta el TS y lo importa). No editar a mano.
- Estos SQL se ejecutan en el **SQL Editor** del dashboard de Supabase, en orden. La app
  también siembra sola la primera vez (ver `roster.ts`).

**Configuración local**: copiar `.env.example` → `.env.local` con `VITE_SUPABASE_URL` y
`VITE_SUPABASE_PUBLISHABLE_KEY` (la *publishable* `sb_publishable_…`, no la `service_role`).
Reiniciar `npm run dev` después. Sin ese archivo la app arranca en modo local. Proyecto del
usuario: `dtybrsbjgatjqllsdhhi.supabase.co`.

**Qué falta para dejarlo conectado** (todo del lado del dashboard/entorno, el código está):
1. `.env.local` con URL + publishable key.
2. Ejecutar `0001_init.sql` (y opcionalmente `seed.sql`) en el SQL Editor.
3. Authentication → Email provider activado; decidir "Confirm email"; añadir
   `http://localhost:5173` a las Redirect URLs para el enlace mágico.
4. Cuando la mesa tenga cuenta, desactivar "Allow new users to sign up".

## Siguientes pasos (README)

Retratos reales (guía `docs/ASSET_PROMPTS.md`) · subirlos a Supabase Storage en vez del
`jsonb` · tiempo real para que el DM vea los PG en directo · importar ficha desde JSON.
