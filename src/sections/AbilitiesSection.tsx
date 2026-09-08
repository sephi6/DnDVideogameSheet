import { motion } from 'framer-motion'
import { NumberField, Panel, ProficiencyPip } from '@/components/ui/controls'
import { ABILITIES, formatModifier } from '@/data/rules'
import { mod, passive, pb, saveBonus } from '@/lib/derive'
import type { AbilityKey, Proficiency } from '@/types/character'
import type { SectionProps } from './types'

const cycle = (p: Proficiency): Proficiency => ((p + 1) % 3) as Proficiency

export function AbilitiesSection({ character, update }: SectionProps) {
  return (
    <div className="stack">
      <div className="abilities-grid">
        {ABILITIES.map((ability, i) => (
          <motion.div
            key={ability.key}
            className="ability-block"
            initial={{ opacity: 0, y: 24, rotate: -2 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ delay: i * 0.03, type: 'spring', stiffness: 320, damping: 26 }}
          >
            <div className="ab-name">{ability.label}</div>
            <motion.div
              className="ab-mod"
              key={character.abilities[ability.key]}
              initial={{ scale: 1.35 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 420, damping: 16 }}
            >
              {formatModifier(mod(character, ability.key))}
            </motion.div>
            <div className="ab-score">
              <NumberField
                big
                value={character.abilities[ability.key]}
                min={1}
                max={30}
                onChange={(v) => update((d) => { d.abilities[ability.key] = v })}
              />
            </div>
            <div className="save-row">
              <ProficiencyPip
                label={`${ability.label} saving throw`}
                level={character.saves[ability.key]}
                onCycle={() => update((d) => { d.saves[ability.key] = cycle(d.saves[ability.key]) })}
              />
              <span className="label" style={{ fontSize: 13 }}>Save</span>
              <span style={{ fontFamily: 'var(--font-label)', fontSize: 22, color: 'var(--gold)' }}>
                {formatModifier(saveBonus(character, ability.key))}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid g3">
        <Panel title="Proficiency">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 40, color: 'var(--gold)' }}>
            +{pb(character)}
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Level {character.identity.level} · added to whatever you are proficient in.
          </p>
        </Panel>

        <Panel title="Passive scores">
          <div className="stack" style={{ gap: 6 }}>
            {([
              ['perception', 'Passive Perception'],
              ['insight', 'Passive Insight'],
              ['investigation', 'Passive Investigation'],
            ] as const).map(([key, label]) => (
              <div key={key} className="row" style={{ justifyContent: 'space-between' }}>
                <span className="label" style={{ fontSize: 14 }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-label)', fontSize: 26, color: 'var(--gold)' }}>
                  {passive(character, key)}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Saving Throws">
          <div className="stack" style={{ gap: 4 }}>
            {ABILITIES.map((a: { key: AbilityKey; label: string }) => (
              <div key={a.key} className="row" style={{ justifyContent: 'space-between' }}>
                <span className="label" style={{ fontSize: 14 }}>{a.label}</span>
                <span style={{ fontFamily: 'var(--font-label)', fontSize: 22 }}>
                  {formatModifier(saveBonus(character, a.key))}
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  )
}
