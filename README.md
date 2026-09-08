# ARCANA — fichas de D&D 2024 con menú de videojuego

Aplicación web para que los jugadores de una mesa de **Dungeons & Dragons 2024**
lleven su ficha. La gracia no es la ficha: es **moverse por ella como por el menú
de un videojuego** —referencia declarada: Persona 5—. Cartas que se inclinan,
barridos rojos entre pantallas, blips de menú y navegación con teclado.

```bash
npm install
npm run dev      # http://localhost:5173
```

## Estado

Ficha completa, login y persistencia en **Supabase** funcionando. Sin
credenciales configuradas la app sigue arrancando en modo local
(`localStorage`, sin login), así que se puede clonar y probar sin montar nada.

Para conectarla a Supabase: [`docs/SUPABASE.md`](docs/SUPABASE.md) — son tres
pasos (credenciales en `.env.local`, ejecutar la migración, activar el acceso
por correo).

Para publicarla en Cloudflare Workers: [`docs/DEPLOY.md`](docs/DEPLOY.md).

> Con el modelo de permisos actual **todos los usuarios registrados ven y editan
> todas las fichas**. Es lo que se quiere para una mesa; conviene cerrar los
> registros abiertos cuando todo el grupo tenga cuenta.

## Cómo se usa

| Pantalla | Teclas |
| --- | --- |
| Título | cualquier tecla |
| Selección de personaje | `←` `→` cambiar · `Enter` abrir · `N` nuevo |
| Ficha | `↑` `↓` navegar · `1`–`8` ir a sección · `Esc` volver |

Todo el ratón funciona igual de bien; el teclado está para que se sienta a mando.

Las ocho secciones de la ficha: **Identidad, Aptitudes, Habilidades, Combate,
Conjuros, Equipo, Rasgos y Diario**. Todo es editable y se guarda solo (hay un
indicador «Guardado» en la cabecera). Cada personaje tiene su **color de acento**,
que tiñe el menú entero al seleccionarlo.

## Reglas de 2024 que ya contempla

- Bonificador de competencia por nivel y competencia/**pericia** en habilidades y salvaciones.
- **Inspiración heroica** y **agotamiento** por niveles (−2 a pruebas de d20 por nivel).
- **Maestrías de arma** en cada ataque.
- Espacios de conjuro calculados por clase (lanzador completo, medio y **pacto** del Brujo).
- Las 12 clases, 10 especies y 16 trasfondos del PHB 2024.

## Estructura

```
src/
├── data/rules.ts        Datos de reglas (clases, habilidades, espacios de conjuro…)
├── data/defaults.ts     Fábrica de personajes y party de ejemplo
├── types/character.ts   Modelo de la ficha (se serializa tal cual a Supabase)
├── lib/derive.ts        Cálculos derivados (modificadores, CD, iniciativa…)
├── lib/sfx.ts           Sonidos de menú sintetizados con WebAudio (sin assets)
├── lib/supabase.ts      Cliente de Supabase y detección de credenciales
├── lib/storage.ts       Servicios de lectura y escritura (local | supabase)
├── lib/image.ts         Reescalado de los retratos subidos
├── store/auth.ts        Sesión: entrar, registrarse, enlace mágico, salir
├── store/roster.ts      Estado de la party, guardado por ficha y sincronización
├── screens/             Título · Acceso · Selección de personaje · Ficha
├── sections/            Las ocho secciones editables
└── styles/              Tokens y estética (fuentes auto-alojadas)
```

## Assets

Los retratos de `public/assets/portraits/` son **emblemas provisionales generados
por código** (`node scripts/generate-assets.mjs`). Están pensados para
sustituirse por ilustraciones hechas con ChatGPT: las instrucciones detalladas
—biblia de estilo, prompts, medidas y colores por clase— están en
[`docs/ASSET_PROMPTS.md`](docs/ASSET_PROMPTS.md).

Las fuentes (Archivo Black, Barlow Condensed, Bebas Neue — todas OFL) están
auto-alojadas en `public/fonts/`; `scripts/fetch-fonts.sh` las regenera.

## Siguientes pasos

1. Retratos reales generados con la guía de prompts.
2. Subir los retratos a Supabase Storage en vez de guardarlos en el jsonb.
3. Tiempo real: que el DM vea los PG de la party moverse en directo.
4. Importar ficha desde JSON (exportar ya funciona, en la cabecera de la ficha).

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Comprobación de tipos + build de producción |
| `npm run preview` | Sirve el build |
| `npm run typecheck` | Solo tipos |
| `node scripts/generate-seed.mjs` | Regenera `supabase/seed.sql` desde el TypeScript |
| `node scripts/generate-assets.mjs` | Regenera los retratos provisionales |
