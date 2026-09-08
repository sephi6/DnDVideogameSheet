# Despliegue en Cloudflare Workers

ARCANA se publica como sitio estático en **Cloudflare Workers** (static assets) con
**integración Git**: cada `push` a `main` construye y publica una versión nueva; cada Pull
Request genera su propia URL de preview.

> **Nota histórica:** este documento describía Cloudflare *Pages*. El proyecto real
> (`dndvideogamesheet`) se creó como **Worker**, que es lo que Cloudflare ofrece hoy por
> defecto para sitios nuevos. Las diferencias que importan están marcadas más abajo.

> **Sobre «que no se pueda bajar el código»:** una SPA es 100 % código de cliente. El
> navegador siempre puede descargar y leer el bundle; eso no se puede impedir y no es un
> fallo. Lo que sí se hace: el build va minificado y **sin source maps**, se quitan
> `console`/`debugger`, y Cloudflare sirve una CSP estricta. La **clave publishable** de
> Supabase viaja en el bundle **a propósito**; quien protege los datos es **RLS + registro
> cerrado**, no ocultar el código.

---

## 1. Endurecer Supabase (antes del primer deploy)

1. **SQL Editor** → si aún no está: ejecutar `supabase/migrations/0001_init.sql` y, si
   quieres la party de ejemplo, `supabase/seed.sql`. Comprobar que `characters` tiene
   **RLS activado**.
2. **Authentication → Sign In / Providers → Email** → **desactivar «Allow new users to
   sign up»**.
   - Con el modelo de permisos actual, cualquier usuario autenticado ve y edita **todas**
     las fichas. En una URL pública esto solo es seguro con el registro cerrado.
3. **Dar de alta a la mesa a mano:** Authentication → **Users → Add user**, marcando
   *Auto Confirm User*. (Alternativa: dejar «Confirm email» ON y que cada jugador use el
   enlace del correo la primera vez.)
4. **Authentication → URL Configuration:**
   - *Site URL:* `https://<worker>.<subdominio>.workers.dev` — este valor se conoce
     **después** del primer deploy; vuelve a este paso entonces.
   - *Redirect URLs:* añade `https://<worker>.<subdominio>.workers.dev/**` y conserva
     `http://localhost:5173/**` para desarrollo. Necesario para el enlace mágico.

---

## 2. Crear el proyecto en Cloudflare

Dashboard → **Workers & Pages → Create → Workers → Import a repository** → repo
`sephi6/DnDVideogameSheet`.

**Configuración de build:**

| Campo | Valor |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Root directory | `/` |

El directorio de salida y el modo SPA **no se configuran en el dashboard**: los fija
`wrangler.jsonc` en la raíz del repo (`assets.directory: "./dist"` y
`assets.not_found_handling: "single-page-application"`).

**Variables de entorno** (añádelas en **Production** y en **Preview**):

| Variable | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://dtybrsbjgatjqllsdhhi.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | la clave `sb_publishable_…` (Settings → API Keys) |
| `NODE_VERSION` | `22` |

> ⚠️ En un Worker hay **dos sitios distintos** donde poner variables. Las `VITE_*` se
> incrustan en tiempo de **build**, así que van en **Settings → Build → Variables and
> secrets** (variables de compilación), *no* en las variables de runtime del Worker. Si se
> ponen en el sitio equivocado el build no las ve, no falla, y la app queda publicada en
> modo local (sin login, guardando en `localStorage`).

> No definas `VITE_SIGNUPS_OPEN`: sin ella, la app no ofrece «Crear cuenta».

**Save and Deploy.** Cuando termine, copia la URL `*.workers.dev` y completa el paso 1.4.

Después de cambiar cualquier `VITE_*` hay que **relanzar el deploy** (Deployments → *Retry
deployment*, o un push nuevo): el build ya construido no las recoge.

### SPA: por qué no hay `_redirects`

Cloudflare **Pages** resuelve el enrutado de una SPA con una regla `/*  /index.html  200`
en `public/_redirects`. **Workers rechaza esa regla**: el deploy falla con

```
Invalid _redirects configuration
Infinite loop detected in this rule.
```

(error 10021 de la API). En Workers el equivalente es `assets.not_found_handling:
"single-page-application"` en `wrangler.jsonc`, que es lo que usa este repo. `public/_headers`
sí funciona igual en ambos, así que la CSP y las cabeceras de caché siguen aplicándose.

Si algún día se vuelve a Pages: borrar `wrangler.jsonc` y recrear `public/_redirects` con
esa línea.

---

## 3. Publicar versiones nuevas

`git push` a `main` → build + deploy automático. Un Pull Request recibe una URL de preview
independiente; al hacer merge, `main` se redepliega.

Para volver a una versión anterior: el Worker → Deployments → *Rollback*.

---

## 4. Verificación

**Local, antes de subir:**
```bash
npm run build
npm run preview        # http://localhost:4173
ls dist/assets         # NO debe haber ficheros *.map
```
- DevTools → Console limpia; Network: la única llamada externa es a `*.supabase.co`.

**Tras el deploy:**
```bash
curl -sI https://<worker>.<subdominio>.workers.dev | grep -iE 'content-security-policy|x-frame-options|strict-transport'
```
- Una ruta inventada (`/loquesea`) debe devolver la app, no un 404 → confirma el modo SPA.
- Sin sesión → sale la pantalla de acceso y no se ve ninguna ficha (RLS deniega a `anon`).
- Intentar registrarse → **falla** (registro cerrado en Supabase).
- Entrar con una cuenta creada a mano → crear/editar una ficha → recargar → sigue ahí.
- Un commit trivial a `main` + push → Cloudflare construye y publica solo.

---

## Pendiente (más adelante)

- **RLS por dueño** (`auth.uid() = owner_id`): políticas ya escritas y comentadas al final
  de `supabase/migrations/0001_init.sql`. Al activarlas, revisar filas con `owner_id` nulo.
- Dominio propio → *Custom domains* del Worker.
