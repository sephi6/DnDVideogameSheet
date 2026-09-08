import { AnimatePresence, motion } from 'framer-motion'
import {
  Button,
  CheckBox,
  Chip,
  NumberField,
  Panel,
  SelectField,
  TextField,
} from '@/components/ui/controls'
import {
  ABILITIES,
  CONDITIONS,
  DAMAGE_TYPES,
  EXHAUSTION_MAX,
  WEAPON_MASTERIES,
  formatModifier,
} from '@/data/rules'
import { uid } from '@/data/defaults'
import { attackBonus, initiative, mod } from '@/lib/derive'
import { play } from '@/lib/sfx'
import type { AbilityKey } from '@/types/character'
import type { SectionProps } from './types'

export function CombatSection({ character, update }: SectionProps) {
  const { combat } = character
  const hpRatio = combat.hpMax > 0 ? Math.max(0, Math.min(1, combat.hpCurrent / combat.hpMax)) : 0

  const nudgeHp = (delta: number) => {
    play(delta < 0 ? 'error' : 'confirm')
    update((d) => {
      let value = delta
      if (value < 0 && d.combat.hpTemp > 0) {
        const absorbed = Math.min(d.combat.hpTemp, -value)
        d.combat.hpTemp -= absorbed
        value += absorbed
      }
      d.combat.hpCurrent = Math.max(-99, Math.min(d.combat.hpMax, d.combat.hpCurrent + value))
    })
  }

  return (
    <div className="stack">
      <div className="grid g4">
        {[
          { label: 'Armor Class', value: combat.armorClass, set: (v: number) => update((d) => { d.combat.armorClass = v }), min: 0, max: 40 },
          { label: 'Initiative', value: initiative(character), set: null },
          { label: 'Speed (ft.)', value: combat.speed, set: (v: number) => update((d) => { d.combat.speed = v }), min: 0, max: 200 },
          { label: `Hit Dice (d${combat.hitDieSize})`, value: combat.hitDiceTotal - combat.hitDiceSpent, set: null },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            className="big-stat"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="bs-label">{stat.label}</div>
            {stat.set ? (
              <NumberField big value={stat.value} min={stat.min} max={stat.max} onChange={stat.set} />
            ) : (
              <div className="bs-value" style={{ color: 'var(--gold)' }}>
                {stat.label === 'Initiative' ? formatModifier(stat.value) : stat.value}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid g2">
        <Panel title="Hit Points">
          <div className="grid g3" style={{ gap: 8 }}>
            <NumberField label="Current" value={combat.hpCurrent} min={-99} max={999} onChange={(v) => update((d) => { d.combat.hpCurrent = v })} />
            <NumberField label="Maximum" value={combat.hpMax} min={1} max={999} onChange={(v) => update((d) => { d.combat.hpMax = v })} />
            <NumberField label="Temporary" value={combat.hpTemp} min={0} max={999} onChange={(v) => update((d) => { d.combat.hpTemp = v })} />
          </div>
          <div className="hp-bar">
            <motion.div className="hp-fill" animate={{ width: `${hpRatio * 100}%` }} transition={{ type: 'spring', stiffness: 180, damping: 24 }} />
            <div className="hp-text">
              {combat.hpCurrent} / {combat.hpMax}
              {combat.hpTemp > 0 ? ` (+${combat.hpTemp} temp)` : ''}
            </div>
          </div>
          <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
            <Button variant="small danger" onClick={() => nudgeHp(-5)}>-5</Button>
            <Button variant="small danger" onClick={() => nudgeHp(-1)}>-1</Button>
            <Button variant="small" onClick={() => nudgeHp(1)}>+1</Button>
            <Button variant="small" onClick={() => nudgeHp(5)}>+5</Button>
            <Button variant="small ghost" onClick={() => update((d) => { d.combat.hpCurrent = d.combat.hpMax; d.combat.deathSuccesses = 0; d.combat.deathFailures = 0 })}>
              Long Rest
            </Button>
          </div>

          <div style={{ marginTop: 14 }}>
            <span className="label">Hit Dice spent</span>
            <div className="tracker" style={{ marginTop: 6 }}>
              {Array.from({ length: Math.max(1, combat.hitDiceTotal) }).map((_, i) => (
                <CheckBox
                  key={i}
                  label={`Hit Die ${i + 1}`}
                  on={i < combat.hitDiceSpent}
                  onToggle={() => update((d) => { d.combat.hitDiceSpent = i < d.combat.hitDiceSpent ? i : i + 1 })}
                />
              ))}
            </div>
          </div>
        </Panel>

        <Panel title="Status">
          <div className="stack" style={{ gap: 14 }}>
            <div>
              <span className="label">Death Saving Throws</span>
              <div className="row" style={{ marginTop: 6, gap: 18, flexWrap: 'wrap' }}>
                <div className="row" style={{ gap: 6 }}>
                  <span className="label" style={{ fontSize: 13, color: 'var(--gold)' }}>Successes</span>
                  <div className="tracker">
                    {[0, 1, 2].map((i) => (
                      <CheckBox
                        key={i}
                        gold
                        label={`Success ${i + 1}`}
                        on={i < combat.deathSuccesses}
                        onToggle={() => update((d) => { d.combat.deathSuccesses = i < d.combat.deathSuccesses ? i : i + 1 })}
                      />
                    ))}
                  </div>
                </div>
                <div className="row" style={{ gap: 6 }}>
                  <span className="label" style={{ fontSize: 13, color: 'var(--blood-hot)' }}>Failures</span>
                  <div className="tracker">
                    {[0, 1, 2].map((i) => (
                      <CheckBox
                        key={i}
                        label={`Failure ${i + 1}`}
                        on={i < combat.deathFailures}
                        onToggle={() => update((d) => { d.combat.deathFailures = i < d.combat.deathFailures ? i : i + 1 })}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="label">Heroic Inspiration</span>
              <Chip on={combat.heroicInspiration} onToggle={() => update((d) => { d.combat.heroicInspiration = !d.combat.heroicInspiration })}>
                {combat.heroicInspiration ? 'Available' : 'Spent'}
              </Chip>
            </div>

            <div>
              <span className="label">
                Exhaustion — level {combat.exhaustion} (−{combat.exhaustion * 2} to D20 Tests, −{combat.exhaustion * 5} ft. Speed)
              </span>
              <div className="tracker" style={{ marginTop: 6 }}>
                {Array.from({ length: EXHAUSTION_MAX }).map((_, i) => (
                  <CheckBox
                    key={i}
                    label={`Exhaustion ${i + 1}`}
                    on={i < combat.exhaustion}
                    onToggle={() => update((d) => { d.combat.exhaustion = i < d.combat.exhaustion ? i : i + 1 })}
                  />
                ))}
              </div>
            </div>

            <div>
              <span className="label">Conditions</span>
              <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                {CONDITIONS.map((cond) => (
                  <Chip
                    key={cond}
                    on={combat.conditions.includes(cond)}
                    onToggle={() => update((d) => {
                      d.combat.conditions = d.combat.conditions.includes(cond)
                        ? d.combat.conditions.filter((c) => c !== cond)
                        : [...d.combat.conditions, cond]
                    })}
                  >
                    {cond}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        title="Attacks"
        actions={
          <Button
            variant="small"
            onClick={() => update((d) => {
              d.combat.attacks.push({
                id: uid('atk'),
                name: 'New weapon',
                ability: 'str',
                proficient: true,
                damage: '1d8',
                damageType: 'Slashing',
                range: 'Melee',
                mastery: '—',
                notes: '',
              })
            })}
          >
            + Add
          </Button>
        }
      >
        <div className="stack" style={{ gap: 10 }}>
          <AnimatePresence initial={false}>
            {character.combat.attacks.map((attack) => (
              <motion.div
                key={attack.id}
                className="entry"
                layout
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              >
                <div className="entry-head">
                  <input
                    className="input grow"
                    value={attack.name}
                    onChange={(e) => update((d) => {
                      const a = d.combat.attacks.find((x) => x.id === attack.id)
                      if (a) a.name = e.target.value
                    })}
                  />
                  <div style={{ fontFamily: 'var(--font-label)', fontSize: 26, color: 'var(--gold)', minWidth: 54, textAlign: 'center' }}>
                    {formatModifier(attackBonus(character, attack.ability, attack.proficient))}
                  </div>
                  <Button variant="small ghost danger" cue="back" onClick={() => update((d) => { d.combat.attacks = d.combat.attacks.filter((x) => x.id !== attack.id) })}>
                    ✕
                  </Button>
                </div>
                <div className="entry-grid">
                  <SelectField
                    label="Ability"
                    value={ABILITIES.find((a) => a.key === attack.ability)?.label ?? 'Strength'}
                    options={ABILITIES.map((a) => a.label)}
                    onChange={(v) => update((d) => {
                      const a = d.combat.attacks.find((x) => x.id === attack.id)
                      const key = ABILITIES.find((ab) => ab.label === v)?.key as AbilityKey | undefined
                      if (a && key) a.ability = key
                    })}
                  />
                  <TextField
                    label="Damage"
                    value={attack.damage}
                    onChange={(v) => update((d) => {
                      const a = d.combat.attacks.find((x) => x.id === attack.id)
                      if (a) a.damage = v
                    })}
                  />
                  <SelectField
                    label="Type"
                    value={attack.damageType}
                    options={DAMAGE_TYPES}
                    onChange={(v) => update((d) => {
                      const a = d.combat.attacks.find((x) => x.id === attack.id)
                      if (a) a.damageType = v
                    })}
                  />
                  <TextField
                    label="Range"
                    value={attack.range}
                    onChange={(v) => update((d) => {
                      const a = d.combat.attacks.find((x) => x.id === attack.id)
                      if (a) a.range = v
                    })}
                  />
                  <SelectField
                    label="Mastery"
                    value={attack.mastery}
                    options={WEAPON_MASTERIES}
                    onChange={(v) => update((d) => {
                      const a = d.combat.attacks.find((x) => x.id === attack.id)
                      if (a) a.mastery = v
                    })}
                  />
                  <div className="field">
                    <span className="label">Proficient</span>
                    <Chip
                      on={attack.proficient}
                      onToggle={() => update((d) => {
                        const a = d.combat.attacks.find((x) => x.id === attack.id)
                        if (a) a.proficient = !a.proficient
                      })}
                    >
                      {attack.proficient ? 'Yes' : 'No'}
                    </Chip>
                  </div>
                </div>
                <div className="muted" style={{ fontSize: 15 }}>
                  Damage: {attack.damage} {formatModifier(mod(character, attack.ability))} {attack.damageType.toLowerCase()}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          {character.combat.attacks.length === 0 && <div className="empty">No attacks recorded</div>}
        </div>
      </Panel>
    </div>
  )
}
