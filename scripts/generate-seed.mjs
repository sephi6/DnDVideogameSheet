/**
 * Genera supabase/seed.sql a partir de la party de ejemplo definida en
 * TypeScript (src/data/defaults.ts), para que no haya dos versiones de los
 * mismos datos. Usa esbuild, que ya viene con Vite.
 *
 *   node scripts/generate-seed.mjs
 */
import { build } from 'esbuild'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '..')

const bundle = await build({
  entryPoints: [resolve(root, 'src/data/defaults.ts')],
  bundle: true,
  write: false,
  format: 'esm',
  platform: 'neutral',
  alias: { '@': resolve(root, 'src') },
})

const code = bundle.outputFiles[0].text
const module = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)

// Ids fijos: así el seed se puede volver a ejecutar sin duplicar nada.
const IDS = [
  'a1000000-0000-4000-8000-000000000001',
  'a1000000-0000-4000-8000-000000000002',
  'a1000000-0000-4000-8000-000000000003',
  'a1000000-0000-4000-8000-000000000004',
]

const roster = module.demoRoster().map((character, i) => ({
  ...character,
  id: IDS[i] ?? character.id,
}))

const quote = (value) => `'${String(value).replace(/'/g, "''")}'`

const rows = roster
  .map((c) => `  (${quote(c.id)}, ${quote(c.identity.name)}, ${quote(JSON.stringify(c))}::jsonb)`)
  .join(',\n')

const sql = `-- ARCANA · party de ejemplo
-- Generado por scripts/generate-seed.mjs a partir de src/data/defaults.ts.
-- No editar a mano: vuelve a lanzar el script si cambian los datos.
--
-- Ejecutar DESPUÉS de supabase/migrations/0001_init.sql.
-- Se puede lanzar varias veces: las filas ya existentes se ignoran.
--
-- owner_id queda a null a propósito: estos personajes son de la mesa, no de
-- una cuenta concreta, y todos los usuarios tienen los mismos permisos.

insert into public.characters (id, name, data) values
${rows}
on conflict (id) do nothing;
`

mkdirSync(resolve(root, 'supabase'), { recursive: true })
writeFileSync(resolve(root, 'supabase/seed.sql'), sql)
console.log(`Escrito supabase/seed.sql con ${roster.length} personajes.`)
