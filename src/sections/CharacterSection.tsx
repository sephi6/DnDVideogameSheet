import { useId, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Button,
  Panel,
  SelectField,
  TextAreaField,
  TextField,
  NumberField,
  ProficiencyPip,
} from '@/components/ui/controls'
import {
  ABILITIES,
  ALIGNMENTS,
  BACKGROUNDS,
  CLASSES,
  SPECIALIZATIONS,
  SPECIES,
  findClass,
  formatModifier,
  slotsForClass,
} from '@/data/rules'
import type { ClassInfo } from '@/data/rules'
import { mod, passive, pb, saveBonus } from '@/lib/derive'
import type { AbilityKey, Proficiency } from '@/types/character'
import { CLASS_PORTRAITS, DEFAULT_PORTRAIT, portraitForClass } from '@/data/defaults'
import { downscaleImage } from '@/lib/image'
import { play } from '@/lib/sfx'
import type { SectionProps } from './types'

export const PORTRAIT_LIBRARY = [...new Set(Object.values(CLASS_PORTRAITS)), DEFAULT_PORTRAIT]

const cycle = (p: Proficiency): Proficiency => ((p + 1) % 3) as Proficiency

/**
 * className is stored as the bare name, so for the five names both books share
 * (Druid, Monk, Paladin, Rogue, Warlock) the accent is the only stored trace of
 * which book the class came from. Match on it, then fall back to the PHB entry.
 */
function resolveClass(className: string, accent: string | undefined): ClassInfo | undefined {
  const named = CLASSES.filter((c) => c.name === className)
  return (
    named.find((c) => accent !== undefined && c.accent.toLowerCase() === accent.toLowerCase()) ??
    named.find((c) => c.origin === 'phb2024') ??
    findClass(className)
  )
}

export function CharacterSection({ character, update }: SectionProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [portraitError, setPortraitError] = useState<string | null>(null)
  const { identity } = character
  const classId = useId()
  const speciesId = useId()
  const resolved = resolveClass(identity.className, identity.accent)
  const specializations = resolved?.origin === 'warcraft' ? SPECIALIZATIONS[resolved.name] : undefined

  const changeClass = (value: string) => {
    // Option values are "origin:name"; the origin picks the right entry for shared names.
    const sep = value.indexOf(':')
    const origin = value.slice(0, sep)
    const name = value.slice(sep + 1)
    const info = CLASSES.find((c) => c.origin === origin && c.name === name)
    update((d) => {
      d.identity.className = name
      if (!info) return
      d.identity.accent = info.accent
      d.combat.hitDieSize = info.hitDie
      d.spellcasting.ability = info.spellAbility
      d.spellcasting.slots = slotsForClass(info.caster, d.identity.level).map((s) => {
        const previous = d.spellcasting.slots.find((p) => p.level === s.level)
        return { ...s, used: Math.min(previous?.used ?? 0, s.total) }
      })
      if (d.identity.portrait === null || d.identity.portrait.startsWith('assets/portraits/')) {
        d.identity.portrait = portraitForClass(name)
      }
    })
  }

  const changeLevel = (level: number) => {
    update((d) => {
      d.identity.level = level
      d.combat.hitDiceTotal = level
      const info = findClass(d.identity.className)
      if (info) {
        d.spellcasting.slots = slotsForClass(info.caster, level).map((s) => {
          const previous = d.spellcasting.slots.find((p) => p.level === s.level)
          return { ...s, used: Math.min(previous?.used ?? 0, s.total) }
        })
      }
    })
  }

  const uploadPortrait = async (file: File) => {
    try {
      const dataUrl = await downscaleImage(file)
      update((d) => {
        d.identity.portrait = dataUrl
      })
      play('confirm')
    } catch (err) {
      console.error('[arcana] could not process the portrait', err)
      play('error')
      setPortraitError('That image could not be processed. Try a PNG or a JPG.')
    }
  }

  return (
    <div className="grid g2">
      <Panel title="Identity">
        <div className="grid g2" style={{ gap: 10 }}>
          <TextField label="Name" value={identity.name} onChange={(v) => update((d) => { d.identity.name = v })} />
          <TextField label="Player" value={identity.player} onChange={(v) => update((d) => { d.identity.player = v })} />
          <label className="field" htmlFor={classId}>
            <span className="label">Class</span>
            <select
              id={classId}
              className="select"
              value={resolved ? `${resolved.origin}:${resolved.name}` : ''}
              onChange={(e) => { play('toggle'); changeClass(e.target.value) }}
            >
              {!resolved && <option value="" disabled>{identity.className || '—'}</option>}
              <optgroup label="Azeroth">
                {CLASSES.filter((c) => c.origin === 'warcraft').map((c) => (
                  <option key={`wow-${c.name}`} value={`${c.origin}:${c.name}`}>{c.name}</option>
                ))}
              </optgroup>
              <optgroup label="Player's Handbook 2024">
                {CLASSES.filter((c) => c.origin === 'phb2024').map((c) => (
                  <option key={`phb-${c.name}`} value={`${c.origin}:${c.name}`}>{c.name}</option>
                ))}
              </optgroup>
            </select>
          </label>
          {specializations ? (
            <SelectField
              label="Specialization"
              value={identity.subclass}
              options={specializations}
              onChange={(v) => update((d) => { d.identity.subclass = v })}
            />
          ) : (
            <TextField label="Subclass" value={identity.subclass} onChange={(v) => update((d) => { d.identity.subclass = v })} />
          )}
          <label className="field" htmlFor={speciesId}>
            <span className="label">Species</span>
            <select
              id={speciesId}
              className="select"
              value={identity.species}
              onChange={(e) => { play('toggle'); update((d) => { d.identity.species = e.target.value }) }}
            >
              {!SPECIES.some((s) => s.name === identity.species) && (
                <option value={identity.species}>{identity.species || '—'}</option>
              )}
              {([
                ['Azeroth', 'warcraft'],
                ["Player's Handbook 2024", 'phb2024'],
                ['Both books', 'both'],
              ] as const).map(([label, origin]) => (
                <optgroup key={origin} label={label}>
                  {SPECIES.filter((s) => s.origin === origin).map((s) => (
                    <option key={s.name} value={s.name}>{s.name}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <SelectField label="Background" value={identity.background} options={BACKGROUNDS} onChange={(v) => update((d) => { d.identity.background = v })} />
          <SelectField label="Alignment" value={identity.alignment} options={ALIGNMENTS} onChange={(v) => update((d) => { d.identity.alignment = v })} />
          <NumberField label="Level" value={identity.level} min={1} max={20} onChange={changeLevel} />
          <NumberField label="Experience Points" value={identity.xp} min={0} max={999999} onChange={(v) => update((d) => { d.identity.xp = v })} />
        </div>
        {resolved?.provisional && (
          <p className="note-provisional">
            Provisional rules. Hit die, saving throws and spell slots for the Warcraft
            classes are placeholders until D&amp;D: World of Warcraft is published.
            Adjust them by hand in Combat and Spellbook.
          </p>
        )}
        <div style={{ marginTop: 10 }}>
          <TextAreaField
            label="Tagline (shown on the character select screen)"
            rows={2}
            value={identity.tagline}
            placeholder="One line that sums them up"
            onChange={(v) => update((d) => { d.identity.tagline = v })}
          />
        </div>
      </Panel>

      <Panel
        title="Portrait"
        actions={
          <>
            <Button variant="small ghost" onClick={() => fileInput.current?.click()}>Upload</Button>
            <Button variant="small ghost" onClick={() => update((d) => { d.identity.portrait = portraitForClass(d.identity.className) })}>
              Default
            </Button>
          </>
        }
      >
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            setPortraitError(null)
            if (file) void uploadPortrait(file)
            e.target.value = ''
          }}
        />
        {portraitError && <p className="login-error" style={{ marginTop: 0 }}>{portraitError}</p>}
        <div className="row" style={{ alignItems: 'flex-start', gap: 14 }}>
          <motion.img
            key={identity.portrait ?? 'none'}
            src={identity.portrait ?? DEFAULT_PORTRAIT}
            alt="Character portrait"
            initial={{ opacity: 0, x: -14, rotate: 0 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 22 }}
            style={{
              width: 150,
              height: 210,
              objectFit: 'cover',
              border: '3px solid var(--seat)',
              boxShadow: 'var(--bevel), 0 0 0 1px var(--accent)',
              flex: '0 0 auto',
            }}
          />
          <div className="stack grow" style={{ gap: 10 }}>
            <div className="field">
              <span className="label">Gallery</span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(52px, 1fr))', gap: 6 }}>
                {PORTRAIT_LIBRARY.map((src) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => {
                      play('toggle')
                      update((d) => { d.identity.portrait = src })
                    }}
                    style={{
                      padding: 0,
                      border: identity.portrait === src ? '3px solid var(--gold)' : '2px solid var(--stone-3)',
                      background: 'none',
                      cursor: 'pointer',
                      aspectRatio: '5 / 7',
                    }}
                  >
                    <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </button>
                ))}
              </div>
            </div>
            <label className="field">
              <span className="label">Menu accent color</span>
              <input
                type="color"
                className="input"
                style={{ height: 42, padding: 3 }}
                value={identity.accent}
                onChange={(e) => update((d) => { d.identity.accent = e.target.value })}
              />
            </label>
          </div>
        </div>
      </Panel>

      <div className="stack" style={{ gridColumn: '1 / -1' }}>
        <div className="abilities-grid">
          {ABILITIES.map((ability, i) => (
            <motion.div
              key={ability.key}
              className="ability-block"
              initial={{ opacity: 0, y: 24, rotate: 0 }}
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
                <span style={{ fontFamily: 'var(--font-data)', fontSize: 22, color: 'var(--gold)' }}>
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
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: 26, color: 'var(--gold)' }}>
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
                  <span style={{ fontFamily: 'var(--font-data)', fontSize: 22 }}>
                    {formatModifier(saveBonus(character, a.key))}
                  </span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
