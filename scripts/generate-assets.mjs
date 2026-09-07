/**
 * Genera los retratos-emblema de marcador de posición (uno por clase) en SVG.
 * Son assets provisionales del MVP: la idea es sustituirlos por las ilustraciones
 * generadas con los prompts de docs/ASSET_PROMPTS.md manteniendo el mismo nombre.
 *
 *   node scripts/generate-assets.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const outDir = resolve(here, '../public/assets/portraits')
mkdirSync(outDir, { recursive: true })

/** Iconos dibujados en una caja de 100x100 centrada en (50,50). */
const EMBLEMS = {
  barbaro: 'M34 90 L64 12 M60 22 C78 24 90 38 88 56 C74 58 62 46 60 22 M60 22 C44 26 34 38 34 54 C48 56 58 44 60 22',
  bardo: 'M50 16 C34 24 26 42 30 60 C22 66 20 78 28 84 C38 92 52 86 52 74 C52 66 46 62 40 62 C40 46 46 32 58 26 Z M58 26 C72 32 78 46 74 60 C82 66 84 78 76 84',
  brujo: 'M20 50 C34 30 66 30 80 50 C66 70 34 70 20 50 Z M50 38 A12 12 0 1 0 50 62 A12 12 0 1 0 50 38 Z M50 14 L54 30 M50 86 L54 70 M18 24 L30 34 M82 24 L70 34',
  clerigo: 'M50 12 L58 34 L80 30 L66 48 L80 66 L58 62 L50 84 L42 62 L20 66 L34 48 L20 30 L42 34 Z M50 34 A14 14 0 1 0 50 62 A14 14 0 1 0 50 34 Z',
  druida: 'M50 88 L50 46 M50 46 C30 46 18 32 20 14 C40 12 52 24 50 46 Z M52 52 C70 52 84 40 82 24 C64 22 50 34 52 52 Z M42 64 C30 64 22 56 22 46 C34 44 44 52 42 64 Z',
  explorador: 'M18 82 L82 18 M82 18 L60 20 M82 18 L80 40 M28 60 L40 72 M22 30 C36 30 46 40 46 54 M22 30 L22 54 C36 54 46 44 46 30',
  guerrero: 'M50 10 L58 24 L58 62 L50 74 L42 62 L42 24 Z M42 62 L30 68 L50 90 L70 68 L58 62 M26 46 L74 46',
  hechicero: 'M50 10 C58 30 74 38 74 56 C74 72 62 86 50 86 C38 86 26 72 26 56 C26 38 42 30 50 10 Z M50 40 C54 52 62 56 62 66 C62 74 56 78 50 78 C44 78 38 74 38 66 C38 56 46 52 50 40 Z',
  mago: 'M24 86 L74 24 M74 24 A10 10 0 1 0 74 24.1 Z M64 12 L68 22 L78 26 L68 30 L64 40 L60 30 L50 26 L60 22 Z M22 46 L26 54 L34 58 L26 62 L22 70 L18 62 L10 58 L18 54 Z',
  monje: 'M30 40 C30 30 40 24 50 24 C60 24 70 30 70 40 L70 58 C70 72 62 82 50 82 C38 82 30 72 30 58 Z M30 46 L22 54 L26 64 M70 46 L78 54 L74 64 M40 44 L40 54 M50 42 L50 54 M60 44 L60 54',
  paladin: 'M50 10 L84 22 L84 50 C84 70 68 84 50 90 C32 84 16 70 16 50 L16 22 Z M50 26 L56 42 L72 42 L60 52 L64 68 L50 58 L36 68 L40 52 L28 42 L44 42 Z',
  picaro: 'M22 22 L58 58 L52 66 L14 30 Z M58 58 L70 46 L82 58 L70 70 Z M28 74 A10 10 0 1 0 28 74.1 Z M64 26 L78 26 L78 40',
  default: 'M50 20 A16 16 0 1 0 50 52 A16 16 0 1 0 50 20 Z M22 88 C22 66 36 56 50 56 C64 56 78 66 78 88 Z',
}

const CLASS_ACCENTS = {
  barbaro: '#e03a2f', bardo: '#d8478f', brujo: '#8b46d6', clerigo: '#e8c15a',
  druida: '#4fae62', explorador: '#3f8f6d', guerrero: '#b9411f', hechicero: '#e2593f',
  mago: '#3f7bd6', monje: '#37b6c4', paladin: '#dcae3c', picaro: '#6f7cd1',
  default: '#e8e2d4',
}

/** Puntos de trama tipo cómic, densidad decreciente hacia arriba. */
function halftone(seed) {
  const dots = []
  let s = seed
  const rand = () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)
  for (let y = 0; y < 22; y++) {
    for (let x = 0; x < 16; x++) {
      const t = y / 21
      if (rand() > t * 1.15) continue
      const r = 1 + t * 2.2 + rand() * 0.6
      dots.push(`<circle cx="${x * 26 + (y % 2) * 13}" cy="${y * 26}" r="${r.toFixed(2)}"/>`)
    }
  }
  return dots.join('')
}

function svg(key, accent, path, seed) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 560" width="400" height="560" role="img" aria-label="Retrato de ${key}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0.6" y2="1">
      <stop offset="0" stop-color="#141317"/>
      <stop offset="1" stop-color="#08080a"/>
    </linearGradient>
    <clipPath id="frame"><rect x="0" y="0" width="400" height="560"/></clipPath>
  </defs>
  <g clip-path="url(#frame)">
    <rect width="400" height="560" fill="url(#bg)"/>
    <g fill="${accent}" opacity="0.20">${halftone(seed)}</g>
    <g stroke="${accent}" stroke-width="26" opacity="0.14">
      <path d="M-120 620 L360 -60"/><path d="M40 700 L520 20"/>
    </g>
    <path d="M0 560 L400 300 L400 560 Z" fill="${accent}" opacity="0.16"/>
    <g transform="translate(200 258) scale(2.6) translate(-50 -50)">
      <g fill="none" stroke="#000" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" opacity="0.85">
        <path d="${path}"/>
      </g>
      <g fill="none" stroke="${accent}" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="${path}"/>
      </g>
    </g>
    <rect x="8" y="8" width="384" height="544" fill="none" stroke="${accent}" stroke-width="3" opacity="0.55"/>
    <text x="200" y="512" text-anchor="middle" font-family="Impact, 'Arial Black', sans-serif" font-size="42"
          letter-spacing="6" fill="${accent}" opacity="0.9">${key.toUpperCase()}</text>
  </g>
</svg>
`
}

let n = 0
for (const [key, path] of Object.entries(EMBLEMS)) {
  const accent = CLASS_ACCENTS[key] ?? '#e8e2d4'
  writeFileSync(resolve(outDir, `${key}.svg`), svg(key, accent, path, 7919 + n * 131))
  n++
}
console.log(`Generados ${n} retratos en public/assets/portraits/`)
