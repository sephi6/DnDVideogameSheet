import { AnimatePresence, motion } from 'framer-motion'
import { Button, Chip, NumberField, Panel, TextAreaField } from '@/components/ui/controls'
import { uid } from '@/data/defaults'
import { carriedWeight, carryCapacity } from '@/lib/derive'
import type { SectionProps } from './types'

const COINS = [
  { key: 'pp', label: 'Platino' },
  { key: 'gp', label: 'Oro' },
  { key: 'ep', label: 'Electrum' },
  { key: 'sp', label: 'Plata' },
  { key: 'cp', label: 'Cobre' },
] as const

export function InventorySection({ character, update }: SectionProps) {
  const { inventory } = character
  const weight = carriedWeight(character)
  const capacity = carryCapacity(character)
  const attuned = inventory.items.filter((i) => i.attuned).length

  return (
    <div className="stack">
      <div className="grid g2">
        <Panel title="Monedas">
          <div className="coin-grid">
            {COINS.map((coin) => (
              <div key={coin.key} className={`coin ${coin.key}`}>
                <div className="cn">{coin.label}</div>
                <NumberField
                  big
                  value={inventory.coins[coin.key]}
                  min={0}
                  max={999999}
                  onChange={(v) => update((d) => { d.inventory.coins[coin.key] = v })}
                />
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Carga">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="label">Peso transportado</span>
            <span style={{ fontFamily: 'var(--font-label)', fontSize: 26, color: weight > capacity ? 'var(--blood-hot)' : 'var(--gold)' }}>
              {weight.toFixed(1)} / {capacity.toFixed(0)} kg
            </span>
          </div>
          <div className="hp-bar">
            <motion.div
              className="hp-fill"
              style={{ background: weight > capacity ? 'var(--blood-hot)' : 'linear-gradient(90deg, #7a6a2a, var(--gold))' }}
              animate={{ width: `${Math.min(100, capacity > 0 ? (weight / capacity) * 100 : 0)}%` }}
            />
          </div>
          <div className="row" style={{ justifyContent: 'space-between', marginTop: 12 }}>
            <span className="label">Objetos sintonizados</span>
            <span style={{ fontFamily: 'var(--font-label)', fontSize: 26, color: attuned > 3 ? 'var(--blood-hot)' : 'var(--gold)' }}>
              {attuned} / 3
            </span>
          </div>
        </Panel>
      </div>

      <Panel
        title="Equipo"
        actions={
          <Button
            variant="small"
            onClick={() => update((d) => {
              d.inventory.items.push({
                id: uid('item'),
                name: 'Objeto nuevo',
                quantity: 1,
                weight: 0,
                attuned: false,
                equipped: false,
                notes: '',
              })
            })}
          >
            + Añadir
          </Button>
        }
      >
        <div className="stack" style={{ gap: 8 }}>
          <AnimatePresence initial={false}>
            {inventory.items.map((item) => (
              <motion.div
                key={item.id}
                className="entry"
                layout
                initial={{ opacity: 0, x: -24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              >
                <div className="entry-head">
                  <input
                    className="input grow"
                    value={item.name}
                    onChange={(e) => update((d) => {
                      const it = d.inventory.items.find((x) => x.id === item.id)
                      if (it) it.name = e.target.value
                    })}
                  />
                  <div style={{ width: 70 }}>
                    <NumberField
                      value={item.quantity}
                      min={0}
                      max={9999}
                      onChange={(v) => update((d) => {
                        const it = d.inventory.items.find((x) => x.id === item.id)
                        if (it) it.quantity = v
                      })}
                    />
                  </div>
                  <div style={{ width: 80 }}>
                    <NumberField
                      value={item.weight}
                      min={0}
                      max={9999}
                      onChange={(v) => update((d) => {
                        const it = d.inventory.items.find((x) => x.id === item.id)
                        if (it) it.weight = v
                      })}
                    />
                  </div>
                  <Chip on={item.equipped} onToggle={() => update((d) => {
                    const it = d.inventory.items.find((x) => x.id === item.id)
                    if (it) it.equipped = !it.equipped
                  })}>
                    Equipado
                  </Chip>
                  <Chip on={item.attuned} onToggle={() => update((d) => {
                    const it = d.inventory.items.find((x) => x.id === item.id)
                    if (it) it.attuned = !it.attuned
                  })}>
                    Sintonizado
                  </Chip>
                  <Button variant="small ghost danger" cue="back" onClick={() => update((d) => {
                    d.inventory.items = d.inventory.items.filter((x) => x.id !== item.id)
                  })}>
                    ✕
                  </Button>
                </div>
                <input
                  className="input"
                  placeholder="Notas del objeto"
                  value={item.notes}
                  onChange={(e) => update((d) => {
                    const it = d.inventory.items.find((x) => x.id === item.id)
                    if (it) it.notes = e.target.value
                  })}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          {inventory.items.length === 0 && <div className="empty">Mochila vacía</div>}
        </div>
        <div style={{ marginTop: 14 }}>
          <TextAreaField
            label="Notas de equipo"
            value={inventory.notes}
            onChange={(v) => update((d) => { d.inventory.notes = v })}
          />
        </div>
      </Panel>
    </div>
  )
}
