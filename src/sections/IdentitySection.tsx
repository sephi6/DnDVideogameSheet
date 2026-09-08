import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Button,
  Panel,
  SelectField,
  TextAreaField,
  TextField,
  NumberField,
} from '@/components/ui/controls'
import { ALIGNMENTS, BACKGROUNDS, CLASSES, SPECIES, findClass, proficiencyBonus, slotsForClass } from '@/data/rules'
import { portraitForClass } from '@/data/defaults'
import { downscaleImage } from '@/lib/image'
import { play } from '@/lib/sfx'
import type { SectionProps } from './types'

const PORTRAIT_LIBRARY = [
  'barbarian', 'bard', 'cleric', 'druid', 'fighter', 'monk',
  'paladin', 'ranger', 'rogue', 'sorcerer', 'warlock', 'wizard', 'default',
].map((slug) => `assets/portraits/${slug}.svg`)

export function IdentitySection({ character, update }: SectionProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [portraitError, setPortraitError] = useState<string | null>(null)
  const { identity } = character

  const changeClass = (name: string) => {
    const info = findClass(name)
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
          <SelectField label="Class" value={identity.className} options={CLASSES.map((c) => c.name)} onChange={changeClass} />
          <TextField label="Subclass" value={identity.subclass} onChange={(v) => update((d) => { d.identity.subclass = v })} />
          <SelectField label="Species" value={identity.species} options={SPECIES} onChange={(v) => update((d) => { d.identity.species = v })} />
          <SelectField label="Background" value={identity.background} options={BACKGROUNDS} onChange={(v) => update((d) => { d.identity.background = v })} />
          <SelectField label="Alignment" value={identity.alignment} options={ALIGNMENTS} onChange={(v) => update((d) => { d.identity.alignment = v })} />
          <NumberField label="Level" value={identity.level} min={1} max={20} onChange={changeLevel} />
          <NumberField label="Experience Points" value={identity.xp} min={0} max={999999} onChange={(v) => update((d) => { d.identity.xp = v })} />
          <div className="field">
            <span className="label">Proficiency Bonus</span>
            <div className="input num" style={{ color: 'var(--gold)' }}>
              +{proficiencyBonus(identity.level)}
            </div>
          </div>
        </div>
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
            src={identity.portrait ?? PORTRAIT_LIBRARY[12]}
            alt="Character portrait"
            initial={{ opacity: 0, x: -14, rotate: -6 }}
            animate={{ opacity: 1, x: 0, rotate: -3 }}
            transition={{ type: 'spring', stiffness: 240, damping: 22 }}
            style={{
              width: 150,
              height: 210,
              objectFit: 'cover',
              border: '3px solid var(--ink)',
              boxShadow: '8px 8px 0 var(--accent)',
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
                      border: identity.portrait === src ? '3px solid var(--gold)' : '2px solid #34313d',
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
    </div>
  )
}
