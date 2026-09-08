import { motion } from 'framer-motion'
import { Panel, TextAreaField } from '@/components/ui/controls'
import type { Journal } from '@/types/character'
import type { SectionProps } from './types'

const FIELDS: { key: keyof Journal; label: string; rows: number; placeholder: string }[] = [
  { key: 'personality', label: 'Personality Traits', rows: 3, placeholder: 'How do they act when nobody is watching?' },
  { key: 'ideals', label: 'Ideals', rows: 2, placeholder: 'What is worth dying for' },
  { key: 'bonds', label: 'Bonds', rows: 2, placeholder: 'People, places, debts' },
  { key: 'flaws', label: 'Flaws', rows: 2, placeholder: 'The crack where they break' },
  { key: 'allies', label: 'Allies and Organizations', rows: 3, placeholder: 'Contacts, guilds, sworn enemies' },
  { key: 'backstory', label: 'Backstory', rows: 8, placeholder: 'Where they come from and why they are here' },
  { key: 'notes', label: 'Session notes', rows: 8, placeholder: 'Clues, names, things not to forget' },
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
