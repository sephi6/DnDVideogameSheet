import { useId, useState } from 'react'
import { kindInfo, resolveRelated, searchEntries } from '@/lib/codex'
import { imageUrl } from '@/lib/codexImages'
import { play } from '@/lib/sfx'
import type { CodexEntry } from '@/types/codex'

/** Links to other entries: removable chips, and a search whose results are full-width rows. */
export function RelatedPicker({ value, entries, selfId, onChange }: {
  value: string[]
  entries: CodexEntry[]
  selfId: string
  onChange: (ids: string[]) => void
}) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const current = resolveRelated(entries, value)
  const results = searchEntries(entries, query, [selfId, ...value])

  const add = (entryId: string) => {
    play('toggle')
    onChange([...value, entryId])
    setQuery('')
    setActive(0)
  }

  return (
    <div className="field cx-related">
      <label className="label" htmlFor={id}>Related entries</label>
      {current.length > 0 && (
        <div className="cx-chips">
          {current.map((e) => (
            <span key={e.id} className="cx-chip cx-chip-static">
              <img src={imageUrl(e.image, e.kind)} alt="" />
              <span>{e.name || 'Unnamed'}</span>
              <button
                type="button"
                className="cx-chip-remove"
                aria-label={`Remove ${e.name || 'Unnamed'}`}
                onClick={() => {
                  play('back')
                  onChange(value.filter((v) => v !== e.id))
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        id={id}
        className="input"
        value={query}
        placeholder="Type a name to link it"
        role="combobox"
        aria-expanded={results.length > 0}
        aria-controls={`${id}-results`}
        aria-activedescendant={results[active] ? `${id}-${results[active].id}` : undefined}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((i) => Math.min(i + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter' && results[active]) {
            e.preventDefault()
            add(results[active].id)
          } else if (e.key === 'Escape' && query) {
            // Only dismisses the suggestions; the wall lets this Escape through (data-escape-clears).
            // With an empty query Escape cancels the editor, as everywhere else.
            e.preventDefault()
            e.stopPropagation()
            setQuery('')
            setActive(0)
          }
        }}
        data-escape-clears
      />
      {results.length > 0 && (
        <ul className="cx-results" id={`${id}-results`} role="listbox">
          {results.map((e, i) => (
            <li key={e.id} id={`${id}-${e.id}`} role="option" aria-selected={i === active}>
              <button type="button" className="cx-result" data-active={i === active} onClick={() => add(e.id)}>
                <img src={imageUrl(e.image, e.kind)} alt="" />
                <span>{e.name || 'Unnamed'}</span>
                <small>{kindInfo(e.kind).title}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
