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

MVP jugable y **local**: los datos se guardan en `localStorage`. Login y
persistencia en Supabase están diseñados pero aún no conectados
(ver [`docs/SUPABASE.md`](docs/SUPABASE.md)).

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
├── lib/storage.ts       Adaptador de persistencia — el punto de enganche de Supabase
├── store/roster.ts      Estado global (zustand) con guardado diferido
├── screens/             Título · Selección de personaje · Armazón de la ficha
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

1. Login con Supabase (magic link o Discord) y persistencia en la nube.
2. Retratos reales generados con la guía de prompts.
3. Vista de DM: ver las fichas de la party en directo.
4. Importar ficha desde JSON (exportar ya funciona, en la cabecera de la ficha).

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Comprobación de tipos + build de producción |
| `npm run preview` | Sirve el build |
| `npm run typecheck` | Solo tipos |
