import { AnimatePresence, motion } from 'framer-motion'
import {
  Button,
  CheckBox,
  Chip,
  NumberField,
  Panel,
  SelectField,
  TextAreaField,
  TextField,
} from '@/components/ui/controls'
import { LANGUAGES } from '@/data/rules'
import { uid } from '@/data/defaults'
import type { SectionProps } from './types'

const RECHARGE_LABELS = {
  none: 'Sin recarga',
  short: 'Descanso corto',
  long: 'Descanso largo',
} as const

export function FeaturesSection({ character, update }: SectionProps) {
  const { features } = character

  return (
    <div className="stack">
      <Panel
        title="Rasgos y dotes"
        actions={
          <Button
            variant="small"
            onClick={() => update((d) => {
              d.features.entries.push({
                id: uid('feat'),
                name: 'Rasgo nuevo',
                source: character.identity.className,
                description: '',
                usesMax: 0,
                usesSpent: 0,
                recharge: 'long',
              })
            })}
          >
            + Añadir
          </Button>
        }
      >
        <div className="stack" style={{ gap: 10 }}>
          <AnimatePresence initial={false}>
            {features.entries.map((entry) => (
              <motion.div
                key={entry.id}
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
                    value={entry.name}
                    onChange={(e) => update((d) => {
                      const f = d.features.entries.find((x) => x.id === entry.id)
                      if (f) f.name = e.target.value
                    })}
                  />
                  <Button variant="small ghost danger" cue="back" onClick={() => update((d) => {
                    d.features.entries = d.features.entries.filter((x) => x.id !== entry.id)
                  })}>
                    ✕
                  </Button>
                </div>
                <div className="entry-grid">
                  <TextField label="Origen" value={entry.source} onChange={(v) => update((d) => {
                    const f = d.features.entries.find((x) => x.id === entry.id)
                    if (f) f.source = v
                  })} />
                  <NumberField label="Usos máximos" value={entry.usesMax} min={0} max={99} onChange={(v) => update((d) => {
                    const f = d.features.entries.find((x) => x.id === entry.id)
                    if (f) { f.usesMax = v; f.usesSpent = Math.min(f.usesSpent, v) }
                  })} />
                  <SelectField
                    label="Recarga"
                    value={RECHARGE_LABELS[entry.recharge]}
                    options={Object.values(RECHARGE_LABELS)}
                    onChange={(v) => update((d) => {
                      const f = d.features.entries.find((x) => x.id === entry.id)
                      const key = (Object.keys(RECHARGE_LABELS) as (keyof typeof RECHARGE_LABELS)[])
                        .find((k) => RECHARGE_LABELS[k] === v)
                      if (f && key) f.recharge = key
                    })}
                  />
                </div>
                {entry.usesMax > 0 && (
                  <div>
                    <span className="label">Usos gastados</span>
                    <div className="tracker" style={{ marginTop: 6 }}>
                      {Array.from({ length: entry.usesMax }).map((_, i) => (
                        <CheckBox
                          key={i}
                          label={`Uso ${i + 1} de ${entry.name}`}
                          on={i < entry.usesSpent}
                          onToggle={() => update((d) => {
                            const f = d.features.entries.find((x) => x.id === entry.id)
                            if (f) f.usesSpent = i < f.usesSpent ? i : i + 1
                          })}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <TextAreaField
                  label="Descripción"
                  rows={2}
                  value={entry.description}
                  onChange={(v) => update((d) => {
                    const f = d.features.entries.find((x) => x.id === entry.id)
                    if (f) f.description = v
                  })}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          {features.entries.length === 0 && <div className="empty">Sin rasgos registrados</div>}
        </div>
      </Panel>

      <div className="grid g2">
        <Panel title="Idiomas">
          <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
            {LANGUAGES.map((lang) => (
              <Chip
                key={lang}
                on={features.languages.includes(lang)}
                onToggle={() => update((d) => {
                  d.features.languages = d.features.languages.includes(lang)
                    ? d.features.languages.filter((l) => l !== lang)
                    : [...d.features.languages, lang]
                })}
              >
                {lang}
              </Chip>
            ))}
          </div>
        </Panel>

        <Panel title="Competencias">
          <div className="stack" style={{ gap: 10 }}>
            <TextAreaField label="Armaduras" rows={2} value={features.armor} onChange={(v) => update((d) => { d.features.armor = v })} />
            <TextAreaField label="Armas" rows={2} value={features.weapons} onChange={(v) => update((d) => { d.features.weapons = v })} />
            <TextAreaField label="Herramientas" rows={2} value={features.tools} onChange={(v) => update((d) => { d.features.tools = v })} />
          </div>
        </Panel>
      </div>
    </div>
  )
}
