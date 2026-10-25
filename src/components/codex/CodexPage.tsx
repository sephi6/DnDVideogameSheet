import { motion, useReducedMotion } from 'framer-motion'
import { Fragment, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/controls'
import { ATTITUDE_LABEL, backlinks, entryFacts, isSettled, kindInfo, resolveRelated } from '@/lib/codex'
import { imageUrl } from '@/lib/codexImages'
import type { Character } from '@/types/character'
import type { CodexEntry } from '@/types/codex'
import { EntryChips } from './EntryChips'

const DAMAGE_ROWS = [['Vulnerable', 'vulnerabilities'], ['Resistant', 'resistances'], ['Immune', 'immunities']] as const

export function CodexPage({ entry, entries, roster, isPhone, onEdit, onClose, onNavigate }: {
  entry: CodexEntry
  entries: CodexEntry[]
  roster: Character[]
  isPhone: boolean
  onEdit: () => void
  onClose: () => void
  onNavigate: (entry: CodexEntry) => void
}) {
  const info = kindInfo(entry.kind)
  const reduce = useReducedMotion()
  const heading = useRef<HTMLHeadingElement>(null)
  // Focus lands on the title whenever a (new) entry is shown.
  useEffect(() => {
    heading.current?.focus({ preventScroll: true })
  }, [entry.id])

  const related = resolveRelated(entries, entry.related)
  const mentioned = backlinks(entries, entry.id)
  const author = roster.find((c) => c.id === entry.addedBy)
  const facts = entryFacts(entry)
  const damage = DAMAGE_ROWS.filter(([, key]) => (entry.details[key]?.length ?? 0) > 0)
  const settled = isSettled(entry)

  return (
    <article className="quest-page cx-page" data-shape={info.shape}>
      <div className="cx-page-bar">
        {isPhone && <Button variant="small" cue="back" onClick={onClose}>◂ Back</Button>}
        <span className="cx-spacer" />
        <Button variant="small" cue="confirm" onClick={onEdit}>Edit</Button>
        {!isPhone && <Button variant="small" cue="back" onClick={onClose}>Close</Button>}
      </div>
      <div className="cx-page-grid">
        <motion.div
          key={entry.id}
          className="cx-plate cx-page-plate"
          data-settled={settled}
          initial={reduce ? false : { scale: 1.04, opacity: 0.6 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <img src={imageUrl(entry.image, entry.kind)} alt="" />
          {settled && <span className="cx-ribbon">{entry.status}</span>}
        </motion.div>
        <div>
          <div className="qp-kicker">
            {entry.attitude && <><span className="cx-seal" data-attitude={entry.attitude}>{ATTITUDE_LABEL[entry.attitude]}</span><span className="dot" /></>}
            <span>{info.title}</span>
            {entry.status && <><span className="dot" /><span>{entry.status}</span></>}
          </div>
          <h2 id="cx-page-title" className="qp-title" tabIndex={-1} ref={heading}>{entry.name || 'Unnamed'}</h2>
          {(facts.length > 0 || author) && (
            <dl className="cx-facts">
              {facts.map(([label, value]) => (
                <Fragment key={label}><dt>{label}</dt><dd>{value}</dd></Fragment>
              ))}
              {author && <><dt>Added by</dt><dd>{author.identity.name}</dd></>}
            </dl>
          )}
          {damage.length > 0 && (
            <dl className="cx-dmg">
              {damage.map(([label, key]) => (
                <Fragment key={key}>
                  <dt>{label}</dt>
                  <dd>{(entry.details[key] ?? []).map((t) => <span key={t}>{t}</span>)}</dd>
                </Fragment>
              ))}
            </dl>
          )}
          {entry.notes && <><div className="qp-rule" /><p className="qp-desc cx-notes">{entry.notes}</p></>}
          {related.length > 0 && (
            <section className="cx-section">
              <h3 className="qp-h">Related</h3>
              <EntryChips list={related} onPick={onNavigate} />
            </section>
          )}
          {mentioned.length > 0 && (
            <section className="cx-section">
              <h3 className="qp-h">Mentioned in</h3>
              <EntryChips list={mentioned} onPick={onNavigate} />
            </section>
          )}
        </div>
      </div>
    </article>
  )
}
