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
  'Trucos', 'Nivel 1', 'Nivel 2', 'Nivel 3', 'Nivel 4',
  'Nivel 5', 'Nivel 6', 'Nivel 7', 'Nivel 8', 'Nivel 9',
]

export function SpellsSection({ character, update }: SectionProps) {
  const { spellcasting } = character
  const dc = spellSaveDC(character)
  const atk = spellAttack(character)
  const levels = Array.from(new Set([0, ...spellcasting.spells.map((s) => s.level)])).sort((a, b) => a - b)

  return (
    <div className="stack">
      <div className="grid g3">
        <Panel title="Aptitud mágica">
          <SelectField
            label="Característica"
            value={ABILITIES.find((a) => a.key === spellcasting.ability)?.label ?? '—'}
            options={['—', ...ABILITIES.map((a) => a.label)]}
            onChange={(v) => update((d) => {
              d.spellcasting.ability = (ABILITIES.find((a) => a.label === v)?.key as AbilityKey) ?? null
            })}
          />
        </Panel>
        <Panel title="CD de salvación">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, color: 'var(--gold)' }}>{dc ?? '—'}</div>
        </Panel>
        <Panel title="Ataque de conjuro">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 44, color: 'var(--gold)' }}>
            {atk === null ? '—' : formatModifier(atk)}
          </div>
        </Panel>
      </div>

      <Panel
        title="Espacios de conjuro"
        actions={
          <Button variant="small ghost" onClick={() => update((d) => { d.spellcasting.slots.forEach((s) => { s.used = 0 }) })}>
            Descanso largo
          </Button>
        }
      >
        {spellcasting.slots.length === 0 ? (
          <div className="empty">Esta clase no tiene espacios de conjuro</div>
        ) : (
          <div className="grid g4">
            {spellcasting.slots.map((slot) => (
              <div key={slot.level} className="big-stat" style={{ textAlign: 'left' }}>
                <div className="bs-label">Nivel {slot.level} · {slot.total - slot.used}/{slot.total}</div>
                <div className="tracker" style={{ marginTop: 6 }}>
                  {Array.from({ length: slot.total }).map((_, i) => (
                    <CheckBox
                      key={i}
                      label={`Espacio de nivel ${slot.level}, número ${i + 1}`}
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
        title="Conjuros"
        actions={
          <Button
            variant="small"
            onClick={() => update((d) => {
              d.spellcasting.spells.push({
                id: uid('spell'),
                name: 'Conjuro nuevo',
                level: 0,
                school: 'Evocación',
                castingTime: '1 acción',
                range: '18 m',
                components: 'V, S',
                duration: 'Instantáneo',
                concentration: false,
                ritual: false,
                prepared: true,
                description: '',
              })
            })}
          >
            + Añadir
          </Button>
        }
      >
        {spellcasting.spells.length === 0 && <div className="empty">Grimorio vacío</div>}
        {levels.map((level) => {
          const spells = spellcasting.spells.filter((s) => s.level === level)
          if (spells.length === 0) return null
          return (
            <div key={level}>
              <div className="spell-level-head">
                <span className="lv">{LEVEL_NAMES[level] ?? `Nivel ${level}`}</span>
                <span className="muted">{spells.length} conjuro(s)</span>
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
                          {spell.prepared ? 'Preparado' : 'Guardado'}
                        </Chip>
                        <Button variant="small ghost danger" cue="back" onClick={() => update((d) => {
                          d.spellcasting.spells = d.spellcasting.spells.filter((x) => x.id !== spell.id)
                        })}>
                          ✕
                        </Button>
                      </div>
                      <div className="entry-grid">
                        <SelectField
                          label="Nivel"
                          value={LEVEL_NAMES[spell.level]}
                          options={LEVEL_NAMES}
                          onChange={(v) => update((d) => {
                            const s = d.spellcasting.spells.find((x) => x.id === spell.id)
                            if (s) s.level = LEVEL_NAMES.indexOf(v)
                          })}
                        />
                        <SelectField
                          label="Escuela"
                          value={spell.school}
                          options={SPELL_SCHOOLS}
                          onChange={(v) => update((d) => {
                            const s = d.spellcasting.spells.find((x) => x.id === spell.id)
                            if (s) s.school = v
                          })}
                        />
                        <TextField label="Tiempo de lanzamiento" value={spell.castingTime} onChange={(v) => update((d) => {
                          const s = d.spellcasting.spells.find((x) => x.id === spell.id)
                          if (s) s.castingTime = v
                        })} />
                        <TextField label="Alcance" value={spell.range} onChange={(v) => update((d) => {
                          const s = d.spellcasting.spells.find((x) => x.id === spell.id)
                          if (s) s.range = v
                        })} />
                        <TextField label="Componentes" value={spell.components} onChange={(v) => update((d) => {
                          const s = d.spellcasting.spells.find((x) => x.id === spell.id)
                          if (s) s.components = v
                        })} />
                        <TextField label="Duración" value={spell.duration} onChange={(v) => update((d) => {
                          const s = d.spellcasting.spells.find((x) => x.id === spell.id)
                          if (s) s.duration = v
                        })} />
                      </div>
                      <div className="row" style={{ gap: 8 }}>
                        <Chip on={spell.concentration} onToggle={() => update((d) => {
                          const s = d.spellcasting.spells.find((x) => x.id === spell.id)
                          if (s) s.concentration = !s.concentration
                        })}>
                          Concentración
                        </Chip>
                        <Chip on={spell.ritual} onToggle={() => update((d) => {
                          const s = d.spellcasting.spells.find((x) => x.id === spell.id)
                          if (s) s.ritual = !s.ritual
                        })}>
                          Ritual
                        </Chip>
                      </div>
                      <TextAreaField
                        label="Descripción"
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
            label="Notas mágicas"
            value={spellcasting.notes}
            onChange={(v) => update((d) => { d.spellcasting.notes = v })}
          />
        </div>
      </Panel>
    </div>
  )
}
