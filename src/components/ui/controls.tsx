import { type ReactNode, useId } from 'react'
import { play } from '@/lib/sfx'

export function Panel({
  title,
  children,
  className = '',
  actions,
}: {
  title?: string
  children: ReactNode
  className?: string
  actions?: ReactNode
}) {
  return (
    <section className={`panel card ${className}`}>
      {title && (
        <header className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3 className="panel-title" style={{ margin: 0 }}>
            <span>{title}</span>
          </h3>
          {actions && <div className="row" style={{ gap: 6 }}>{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const id = useId()
  return (
    <label className="field" htmlFor={id}>
      <span className="label">{label}</span>
      <input
        id={id}
        className="input"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function NumberField({
  label,
  value,
  onChange,
  min = -99,
  max = 999,
  big = false,
}: {
  label?: string
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  big?: boolean
}) {
  const id = useId()
  const commit = (raw: string) => {
    const n = Number.parseInt(raw, 10)
    onChange(Number.isNaN(n) ? min : Math.max(min, Math.min(max, n)))
  }
  const input = (
    <input
      id={id}
      className={`input ${big ? 'num' : ''}`}
      type="number"
      inputMode="numeric"
      value={String(value)}
      min={min}
      max={max}
      onChange={(e) => commit(e.target.value)}
    />
  )
  if (!label) return input
  return (
    <label className="field" htmlFor={id}>
      <span className="label">{label}</span>
      {input}
    </label>
  )
}

export function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (v: string) => void
}) {
  const id = useId()
  return (
    <label className="field" htmlFor={id}>
      <span className="label">{label}</span>
      <select
        id={id}
        className="select"
        value={value}
        onChange={(e) => {
          play('toggle')
          onChange(e.target.value)
        }}
      >
        {!options.includes(value) && <option value={value}>{value || '—'}</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  rows?: number
  placeholder?: string
}) {
  const id = useId()
  return (
    <label className="field" htmlFor={id}>
      <span className="label">{label}</span>
      <textarea
        id={id}
        className="textarea"
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function Button({
  children,
  onClick,
  variant = '',
  title,
  cue = 'toggle',
}: {
  children: ReactNode
  onClick: () => void
  variant?: string
  title?: string
  cue?: 'toggle' | 'confirm' | 'back'
}) {
  return (
    <button
      type="button"
      className={`btn ${variant}`}
      title={title}
      onClick={() => {
        play(cue)
        onClick()
      }}
    >
      <span>{children}</span>
    </button>
  )
}

/** Casilla marcable: golpes de espada, dados de golpe, salvaciones de muerte. */
export function CheckBox({
  on,
  onToggle,
  gold = false,
  label,
}: {
  on: boolean
  onToggle: () => void
  gold?: boolean
  label: string
}) {
  return (
    <button
      type="button"
      className={`box ${gold ? 'gold' : ''}`}
      data-on={on}
      aria-label={label}
      aria-pressed={on}
      onClick={() => {
        play('toggle')
        onToggle()
      }}
    />
  )
}

/** Círculo de competencia de tres estados: nada → competente → experto. */
export function ProficiencyPip({
  level,
  onCycle,
  label,
}: {
  level: 0 | 1 | 2
  onCycle: () => void
  label: string
}) {
  const titles = ['Sin competencia', 'Competente', 'Experto'] as const
  return (
    <button
      type="button"
      className="pip"
      data-level={level}
      title={`${label}: ${titles[level]}`}
      aria-label={`${label}: ${titles[level]}`}
      onClick={() => {
        play('toggle')
        onCycle()
      }}
    />
  )
}

export function Chip({
  on,
  onToggle,
  children,
}: {
  on: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className="chip"
      data-on={on}
      aria-pressed={on}
      onClick={() => {
        play('toggle')
        onToggle()
      }}
    >
      {children}
    </button>
  )
}

export function HintBar({ hints }: { hints: [string, string][] }) {
  return (
    <div className="hint-bar">
      {hints.map(([key, text]) => (
        <span key={key + text}>
          <kbd className="key">{key}</kbd>
          {text}
        </span>
      ))}
    </div>
  )
}
