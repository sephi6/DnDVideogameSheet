# Despliegue en Cloudflare Pages

ARCANA se publica como sitio estático en **Cloudflare Pages** con **integración Git**:
cada `push` a `main` construye y publica una versión nueva; cada Pull Request genera su
propia URL de preview.

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
   - *Site URL:* `https://<proyecto>.pages.dev` — este valor se conoce **después** del
     primer deploy; vuelve a este paso entonces.
   - *Redirect URLs:* añade `https://<proyecto>.pages.dev/**` y conserva
     `http://localhost:5173/**` para desarrollo. Necesario para el enlace mágico.

---

## 2. Crear el proyecto en Cloudflare Pages

Dashboard → **Workers & Pages → Create → Pages → Connect to Git** → repo
`sephi6/DnDVideogameSheet`.

**Configuración de build:**

| Campo | Valor |
| --- | --- |
| Production branch | `main` |
| Framework preset | `Vite` (o *None*) |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |

**Variables de entorno** (añádelas en **Production** y en **Preview**):

| Variable | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | `https://<proyecto>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | la clave `sb_publishable_…` (Settings → API Keys) |
| `NODE_VERSION` | `22` |

> No definas `VITE_SIGNUPS_OPEN`: sin ella, la app no ofrece «Crear cuenta».

**Save and Deploy.** Cuando termine, copia la URL `*.pages.dev` y completa el paso 1.4.

Las variables `VITE_*` se incrustan **en tiempo de build**, así que después de cambiar
cualquiera hay que relanzar el deploy (Deployments → Retry deployment, o un push nuevo).

---

## 3. Publicar versiones nuevas

`git push` a `main` → build + deploy automático. Un Pull Request recibe una URL de preview
independiente; al hacer merge, `main` se redepliega.

Para volver a una versión anterior: Pages → Deployments → *Rollback to this deployment*.

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
curl -sI https://<proyecto>.pages.dev | grep -iE 'content-security-policy|x-frame-options|strict-transport'
```
- Sin sesión → sale la pantalla de acceso y no se ve ninguna ficha (RLS deniega a `anon`).
- Intentar registrarse → **falla** (registro cerrado en Supabase).
- Entrar con una cuenta creada a mano → crear/editar una ficha → recargar → sigue ahí.
- Un commit trivial a `main` + push → Cloudflare construye y publica solo.

---

## Pendiente (más adelante)

- **RLS por dueño** (`auth.uid() = owner_id`): políticas ya escritas y comentadas al final
  de `supabase/migrations/0001_init.sql`. Al activarlas, revisar filas con `owner_id` nulo.
- Dominio propio en Pages → *Custom domains*.
