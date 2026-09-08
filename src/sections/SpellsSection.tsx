import { AnimatePresence, motion } from 'framer-motion'
import {
  Button,
  CheckBox,
  Chip,
  Panel,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/ui/controls'
import { ABILITIES, SPELL_SCHOOLS, formatModifier } from '@/data/rules'
import { uid } from '@/data/defaults'
import { spellAttack, spellSaveDC } from '@/lib/derive'
import type { AbilityKey } from '@/types/character'
import type { SectionProps } from './types'

const LEVEL_NAMES = [
  'Cantrips', 'Level 1', 'Level 2', 'Level 3', 'Level 4',
  'Level 5', 'Level 6', 'Level 7', 'Level 8', 'Level 9',
]

export function SpellsSection({ character, update }: SectionProps) {
  const { spellcasting } = character
  const dc = spellSaveDC(character)
  const atk = spellAttack(character)
  const levels = Array.from(new Set([0, ...spellcasting.spells.map((s) => s.level)])).sort((a, b) => a - b)

  return (
    <div className="stack">
      <div className="grid g3">
        <Panel title="Spellcasting Ability">
          <SelectField
            label="Ability"
            value={ABILITIES.find((a) => a.key === spellcasting.ability)?.label ?? '—'}
            options={['—', ...ABILITIES.map((a) => a.label)]}
            onChange={(v) => update((d) => {
              d.spellcasting.ability = (ABILITIES.find((a) => a.label === v)?.key as AbilityKey) ?? null
            })}
          />
        </Panel>
        <Panel title="Spell Save DC">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, color: 'var(--gold)' }}>{dc ?? '—'}</div>
        </Panel>
        <Panel title="Spell Attack Bonus">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, color: 'var(--gold)' }}>
            {atk === null ? '—' : formatModifier(atk)}
          </div>
        </Panel>
      </div>

      <Panel
        title="Spell Slots"
        actions={
          <Button variant="small ghost" onClick={() => update((d) => { d.spellcasting.slots.forEach((s) => { s.used = 0 }) })}>
            Long Rest
          </Button>
        }
      >
        {spellcasting.slots.length === 0 ? (
          <div className="empty">This class has no spell slots</div>
        ) : (
          <div className="grid g4">
            {spellcasting.slots.map((slot) => (
              <div key={slot.level} className="big-stat" style={{ textAlign: 'left' }}>
                <div className="bs-label">Level {slot.level} · {slot.total - slot.used}/{slot.total}</div>
                <div className="tracker" style={{ marginTop: 6 }}>
                  {Array.from({ length: slot.total }).map((_, i) => (
                    <CheckBox
                      key={i}
                      label={`Level ${slot.level} slot, number ${i + 1}`}
                      on={i < slot.used}
                      onToggle={() => update((d) => {
                        const s = d.spellcasting.slots.find((x) => x.level === slot.level)
                        if (s) s.used = i < s.used ? i : i + 1
                      })}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Spells"
        actions={
          <Button
            variant="small"
            onClick={() => update((d) => {
              d.spellcasting.spells.push({
                id: uid('spell'),
                name: 'New spell',
                level: 0,
                school: 'Evocation',
                castingTime: '1 action',
                range: '60 feet',
                components: 'V, S',
                duration: 'Instantaneous',
                concentration: false,
                ritual: false,
                prepared: true,
                description: '',
              })
            })}
          >
            + Add
          </Button>
        }
      >
        {spellcasting.spells.length === 0 && <div className="empty">Empty spellbook</div>}
        {levels.map((level) => {
          const spells = spellcasting.spells.filter((s) => s.level === level)
          if (spells.length === 0) return null
          return (
            <div key={level}>
              <div className="spell-level-head">
                <span className="lv">{LEVEL_NAMES[level] ?? `Level ${level}`}</span>
                <span className="muted">{spells.length} spell(s)</span>
              </div>
              <div className="stack" style={{ gap: 10 }}>
                <AnimatePresence initial={false}>
                  {spells.map((spell) => (
                    <motion.div
                      key={spell.id}
                      className="entry"
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 40 }}
                      transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                    >
                      <div className="entry-head">
                        <input
                          className="input grow"
                          value={spell.name}
                          onChange={(e) => update((d) => {
                            const s = d.spellcasting.spells.find((x) => x.id === spell.id)
                            if (s) s.name = e.target.value
                          })}
                        />
                        <Chip
                          on={spell.prepared}
                          onToggle={() => update((d) => {
                            const s = d.spellcasting.spells.find((x) => x.id === spell.id)
                            if (s) s.prepared = !s.prepared
                          })}
                        >
                          {spell.prepared ? 'Prepared' : 'Known'}
                        </Chip>
                        <Button variant="small ghost danger" cue="back" onClick={() => update((d) => {
                          d.spellcasting.spells = d.spellcasting.spells.filter((x) => x.id !== spell.id)
                        })}>
                          ✕
                        </Button>
                      </div>
                      <div className="entry-grid">
                        <SelectField
                          label="Level"
                          value={LEVEL_NAMES[spell.level]}
                          options={LEVEL_NAMES}
                          onChange={(v) => update((d) => {
                            const s = d.spellcasting.spells.find((x) => x.id === spell.id)
                            if (s) s.level = LEVEL_NAMES.indexOf(v)
                          })}
                        />
                        <SelectField
                          label="School"
                          value={spell.school}
                          options={SPELL_SCHOOLS}
                          onChange={(v) => update((d) => {
                            const s = d.spellcasting.spells.find((x) => x.id === spell.id)
                            if (s) s.school = v
                          })}
                        />
                        <TextField label="Casting Time" value={spell.castingTime} onChange={(v) => update((d) => {
                          const s = d.spellcasting.spells.find((x) => x.id === spell.id)
                          if (s) s.castingTime = v
                        })} />
                        <TextField label="Range" value={spell.range} onChange={(v) => update((d) => {
                          const s = d.spellcasting.spells.find((x) => x.id === spell.id)
                          if (s) s.range = v
                        })} />
                        <TextField label="Components" value={spell.components} onChange={(v) => update((d) => {
                          const s = d.spellcasting.spells.find((x) => x.id === spell.id)
                          if (s) s.components = v
                        })} />
                        <TextField label="Duration" value={spell.duration} onChange={(v) => update((d) => {
                          const s = d.spellcasting.spells.find((x) => x.id === spell.id)
                          if (s) s.duration = v
                        })} />
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <Chip on={spell.concentration} onToggle={() => update((d) => {
                          const s = d.spellcasting.spells.find((x) => x.id === spell.id)
                          if (s) s.concentration = !s.concentration
                        })}>
                          Concentration
                        </Chip>
                        <Chip on={spell.ritual} onToggle={() => update((d) => {
                          const s = d.spellcasting.spells.find((x) => x.id === spell.id)
                          if (s) s.ritual = !s.ritual
                        })}>
                          Ritual
                        </Chip>
                      </div>
                      <TextAreaField
                        label="Description"
                        rows={2}
                        value={spell.description}
                        onChange={(v) => update((d) => {
                          const s = d.spellcasting.spells.find((x) => x.id === spell.id)
                          if (s) s.description = v
                        })}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )
        })}
        <div style={{ marginTop: 14 }}>
          <TextAreaField
            label="Spellcasting notes"
            value={spellcasting.notes}
            onChange={(v) => update((d) => { d.spellcasting.notes = v })}
          />
        </div>
      </Panel>
    </div>
  )
}
