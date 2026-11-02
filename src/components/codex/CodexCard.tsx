import { ATTITUDE_LABEL, isSettled } from '@/lib/codex'
import { emblemOnError, imageUrl } from '@/lib/codexImages'
import { play } from '@/lib/sfx'
import type { CodexEntry } from '@/types/codex'

export function CodexCard({ entry, selected, fresh, onFocus, onOpen, cardRef }: {
  entry: CodexEntry
  selected: boolean
  fresh: boolean
  onFocus: () => void
  onOpen: () => void
  cardRef: (el: HTMLButtonElement | null) => void
}) {
  const settled = isSettled(entry)
  const name = entry.name || 'Unnamed'
  const attitude = entry.attitude ? ATTITUDE_LABEL[entry.attitude] : null
  return (
    <button
      ref={cardRef}
      type="button"
      className="cx-card"
      data-selected={selected}
      data-fresh={fresh}
      // Roving tabindex: the selected card is the wall's single tab stop.
      tabIndex={selected ? 0 : -1}
      aria-label={[name, attitude, settled ? entry.status : null, fresh ? 'new' : null].filter(Boolean).join(', ')}
      onFocus={onFocus}
      onClick={() => {
        play('confirm')
        onOpen()
      }}
    >
      <span className="cx-plate" data-settled={settled}>
        <img src={imageUrl(entry.image, entry.kind)} onError={emblemOnError(entry.kind)} alt="" loading="lazy" decoding="async" />
        {settled && <span className="cx-ribbon">{entry.status}</span>}
      </span>
      <span className="cx-name">{name}</span>
      {attitude && <span className="cx-seal" data-attitude={entry.attitude}>{attitude}</span>}
      {fresh && <span className="cx-new">New</span>}
    </button>
  )
}
