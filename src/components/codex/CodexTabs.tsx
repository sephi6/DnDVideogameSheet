import { TAB_ORDER, kindInfo, type CodexTab } from '@/lib/codex'
import { play } from '@/lib/sfx'
import type { CodexKind } from '@/types/codex'

const ICONS: Record<CodexTab, string> = {
  npc: 'M12 4a4 4 0 1 1 0 8a4 4 0 1 1 0-8M4 21c1-5 4-7 8-7s7 2 8 7',
  place: 'M3 20h18M5 20V10l3-3 3 3v10M13 20V6l3-3 3 3v14',
  faction: 'M6 3v18M6 4h12l-3 4 3 4H6',
  creature: 'M4 18c2-8 6-12 8-12s6 4 8 12M8 12L6 7M16 12l2-5M9 15h.01M15 15h.01',
  lore: 'M5 4h10l4 4v12H5zM15 4v4h4M8 12h8M8 16h6',
  background: 'M4 5c3-1 5-1 8 1 3-2 5-2 8-1v14c-3-1-5-1-8 1-3-2-5-2-8-1z',
}

export function CodexTabs({ tab, counts, onChange }: {
  tab: CodexTab
  counts: Record<CodexKind, number>
  onChange: (tab: CodexTab) => void
}) {
  return (
    <div className="cx-tabs" role="tablist" aria-label="Journal">
      {TAB_ORDER.map((t) => (
        <button
          key={t}
          type="button"
          role="tab"
          aria-selected={t === tab}
          className={`cx-tab${t === 'background' ? ' cx-tab-private' : ''}`}
          data-on={t === tab}
          title={t === 'background' ? 'Only on this sheet' : undefined}
          onClick={() => {
            if (t === tab) return
            play('toggle')
            onChange(t)
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS[t]} /></svg>
          <span>{t === 'background' ? 'Background' : kindInfo(t).label}</span>
          {t !== 'background' && <b>{counts[t]}</b>}
        </button>
      ))}
    </div>
  )
}
