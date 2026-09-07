import { motion } from 'framer-motion'
import { Panel, TextAreaField } from '@/components/ui/controls'
import type { Journal } from '@/types/character'
import type { SectionProps } from './types'

const FIELDS: { key: keyof Journal; label: string; rows: number; placeholder: string }[] = [
  { key: 'personality', label: 'Rasgos de personalidad', rows: 3, placeholder: '¿Cómo se comporta cuando nadie mira?' },
  { key: 'ideals', label: 'Ideales', rows: 2, placeholder: 'Aquello por lo que merece la pena morir' },
  { key: 'bonds', label: 'Vínculos', rows: 2, placeholder: 'Personas, lugares, deudas' },
  { key: 'flaws', label: 'Defectos', rows: 2, placeholder: 'La grieta por donde se rompe' },
  { key: 'allies', label: 'Aliados y organizaciones', rows: 3, placeholder: 'Contactos, gremios, enemigos jurados' },
  { key: 'backstory', label: 'Historia', rows: 8, placeholder: 'De dónde viene y por qué está aquí' },
  { key: 'notes', label: 'Notas de partida', rows: 8, placeholder: 'Pistas, nombres, cosas que no hay que olvidar' },
]

export function JournalSection({ character, update }: SectionProps) {
  return (
    <div className="grid g2">
      {FIELDS.map((field, i) => (
        <motion.div
          key={field.key}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          style={{ gridColumn: field.rows >= 8 ? 'span 1' : undefined }}
        >
          <Panel title={field.label}>
            <TextAreaField
              label=""
              rows={field.rows}
              placeholder={field.placeholder}
              value={character.journal[field.key]}
              onChange={(v) => update((d) => { d.journal[field.key] = v })}
            />
          </Panel>
        </motion.div>
      ))}
    </div>
  )
}
