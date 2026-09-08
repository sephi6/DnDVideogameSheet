# Supabase: puesta en marcha

La app funciona en dos modos y decide sola cuál usar:

| Modo | Cuándo | Qué hace |
| --- | --- | --- |
| **Local** | No hay `.env.local` | Guarda en `localStorage`, sin login. Útil para trastear. |
| **Nube** | Hay `.env.local` | Pide login y lee/escribe en Supabase. |

---

## 1. Credenciales

Crea `.env.local` en la raíz (no se sube al repositorio):

```bash
VITE_SUPABASE_URL=https://dtybrsbjgatjqllsdhhi.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_xxxxxxxxxxxxxxxxxxxxxx
```

- **URL**: Dashboard → Settings → Data API → *Project URL*.
- **Clave**: Dashboard → Settings → API Keys → la **publishable** (`sb_publishable_…`).
  Es una clave pensada para vivir en el navegador; quien protege los datos es RLS.
  La `secret` / `service_role` **no** debe aparecer nunca en el frontend.

Reinicia `npm run dev` después de crear el archivo: Vite lee las variables al arrancar.

## 2. Crear las tablas

Dashboard → **SQL Editor** → *New query* → pega entero
[`supabase/migrations/0001_init.sql`](../supabase/migrations/0001_init.sql) → *Run*.

Crea la tabla `characters`, sus índices, el disparador que mantiene `updated_at`
y las políticas de RLS.

## 3. Datos de ejemplo

Dos caminos, el que prefieras:

- **Automático**: al entrar por primera vez con la tabla vacía, la app siembra
  la party de ejemplo (Kaelith, Brann, Nyx y Sor Maren). Solo lo hace una vez;
  si luego los borras, no vuelven.
- **Manual**: ejecuta [`supabase/seed.sql`](../supabase/seed.sql) en el SQL Editor.
  Se puede lanzar varias veces sin duplicar nada.

Ese archivo se genera desde el TypeScript para que no haya dos copias de los
mismos datos:

```bash
node scripts/generate-seed.mjs
```

## 4. Activar el acceso por correo

Dashboard → **Authentication** → *Sign In / Providers* → **Email** activado.

Para una mesa privada, lo cómodo es **desactivar «Confirm email»** (en el mismo
panel): así crear la cuenta entra directamente, sin depender del correo. Si lo
dejas activado, cada jugador tendrá que pulsar el enlace que reciba antes de
poder entrar, y el remitente por defecto de Supabase está limitado a unos pocos
envíos por hora.

La pantalla de acceso ofrece correo + contraseña y, como alternativa, un enlace
mágico (botón «Enviarme un enlace»), que sí necesita correo funcionando.

> **Cuando todos tengáis cuenta, desactiva los registros abiertos**
> (*Allow new users to sign up*). Con el modelo de permisos actual, cualquiera
> que se registre en este proyecto ve y edita todas las fichas.

## 5. Modelo de permisos

Tal y como se pidió, **todos los usuarios autenticados tienen los mismos
permisos**: leer, crear, editar y borrar *cualquier* ficha. Es lo natural para
una party donde todo el mundo se fía del resto y el DM toca las fichas de todos.

Lo que eso implica:

- Quien tenga cuenta en el proyecto puede modificar o borrar la ficha de otro.
- Sin sesión no se ve nada: el rol `anon` no tiene ninguna política.
- `owner_id` se guarda igualmente (quién creó cada ficha), aunque hoy no
  restrinja nada. Está ahí para poder cerrar permisos sin migrar datos.

Para cerrarlo más adelante, al final de `0001_init.sql` están las políticas
estrictas por dueño, comentadas y listas para usar.

## 6. Cómo está montado el código

```
src/lib/supabase.ts     Cliente y detección de si hay credenciales
src/lib/storage.ts      Servicios de lectura y escritura (local | supabase)
src/store/auth.ts       Sesión: entrar, registrarse, enlace mágico, salir
src/store/roster.ts     Estado de la party, guardado y estado de sincronización
src/screens/LoginScreen.tsx
```

Detalles que importan:

- **Se guarda ficha a ficha**, no la party entera, y con medio segundo de
  margen desde la última tecla. Editar dos personajes no encola un guardado
  detrás del otro.
- **La ficha completa va en `data` (jsonb)**. `name` y `owner_id` se
  desnormalizan para poder listar y filtrar desde SQL sin abrir el json. El
  modelo puede crecer (`src/types/character.ts`) sin migrar columnas.
- **Si un guardado falla**, la cabecera de la ficha lo dice y aparece un botón
  *Reintentar*; el trabajo no se pierde de la pantalla. Un borrado que falla
  devuelve el personaje a la lista.
- **La lectura está protegida contra duplicados**: React monta los efectos dos
  veces en desarrollo, y sin esa guarda la party de ejemplo se sembraba dos veces.
- **Los ids son UUID** de verdad, para que sean la clave primaria de la tabla.

## 7. Lo que aún no está

- **Retratos en Storage.** Hoy una imagen subida se guarda como data-url dentro
  del jsonb; se reescala a 1000×1400 antes de guardarla para que la fila no se
  dispare. Lo suyo sería un bucket `portraits` y guardar solo la URL.
- **Tiempo real.** `supabase.channel('characters')` con `postgres_changes`
  permitiría que el DM viera los PG de la party moverse en directo.
- **Partidas/mesas.** Hoy hay una sola party: todas las fichas de la base. Si
  hiciera falta separar mesas, tocaría una tabla `campaigns` y filtrar por ella.
