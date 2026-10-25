import { kindInfo } from '@/lib/codex'
import { imageUrl } from '@/lib/codexImages'
import type { CodexEntry } from '@/types/codex'

/** Linked entries as thumbnail chips; picking one navigates to it. */
export function EntryChips({ list, onPick }: { list: CodexEntry[]; onPick: (entry: CodexEntry) => void }) {
  return (
    <div className="cx-chips">
      {list.map((e) => (
        <button key={e.id} type="button" className="cx-chip" onClick={() => onPick(e)}>
          <img src={imageUrl(e.image, e.kind)} alt="" loading="lazy" />
          <span>{e.name || 'Unnamed'}</span>
          <small>{kindInfo(e.kind).title}</small>
        </button>
      ))}
    </div>
  )
}
