import { motion } from 'framer-motion'
import { Panel, ProficiencyPip } from '@/components/ui/controls'
import { ABILITIES, SKILLS, formatModifier } from '@/data/rules'
import { skillBonus } from '@/lib/derive'
import type { Proficiency } from '@/types/character'
import type { SectionProps } from './types'

const cycle = (p: Proficiency): Proficiency => ((p + 1) % 3) as Proficiency

export function SkillsSection({ character, update }: SectionProps) {
  const half = Math.ceil(SKILLS.length / 2)
  const columns = [SKILLS.slice(0, half), SKILLS.slice(half)]

  return (
    <div className="stack">
      <p className="muted" style={{ margin: 0 }}>
        Pulsa el círculo para alternar: vacío → <b style={{ color: 'var(--accent)' }}>competente</b> →{' '}
        <b style={{ color: 'var(--gold)' }}>experto</b>.
      </p>
      <div className="grid g2">
        {columns.map((column, ci) => (
          <Panel key={ci} title={ci === 0 ? 'Habilidades A–I' : 'Habilidades I–S'}>
            {column.map((skill, i) => (
              <motion.div
                key={skill.key}
                className="skill-row"
                initial={{ opacity: 0, x: -18 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: (ci * half + i) * 0.018, duration: 0.22 }}
              >
                <ProficiencyPip
                  label={skill.label}
                  level={character.skills[skill.key]}
                  onCycle={() => update((d) => { d.skills[skill.key] = cycle(d.skills[skill.key]) })}
                />
                <span className="sk-name">{skill.label}</span>
                <span className="sk-ability">
                  {ABILITIES.find((a) => a.key === skill.ability)?.short}
                </span>
                <span className="sk-value">{formatModifier(skillBonus(character, skill.key))}</span>
              </motion.div>
            ))}
          </Panel>
        ))}
      </div>
    </div>
  )
}
