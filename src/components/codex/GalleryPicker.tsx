import { galleryFor } from '@/data/codexGallery'
import { kindInfo } from '@/lib/codex'
import { play } from '@/lib/sfx'
import type { CodexKind } from '@/types/codex'

/** The repo illustrations for one kind, as framed thumbnails. */
export function GalleryPicker({ kind, current, onPick }: { kind: CodexKind; current: string | null; onPick: (path: string) => void }) {
  const images = galleryFor(kind)
  if (images.length === 0) {
    return <p className="cx-gallery-empty">No gallery images for {kindInfo(kind).label.toLowerCase()} yet. Upload one instead.</p>
  }
  return (
    <div className="cx-gallery" data-shape={kindInfo(kind).shape}>
      {images.map((g) => (
        <button
          key={g.path}
          type="button"
          className="cx-gallery-item"
          aria-pressed={g.path === current}
          title={g.label}
          onClick={() => {
            play('confirm')
            onPick(g.path)
          }}
        >
          <span className="cx-plate"><img src={g.path} alt={g.label} loading="lazy" /></span>
        </button>
      ))}
    </div>
  )
}
