import { type MutableRefObject, useEffect, useRef, useState } from 'react'
import { Button, Chip, SelectField, TextAreaField, TextField } from '@/components/ui/controls'
import { CREATURE_TYPES, DAMAGE_TYPES } from '@/data/rules'
import { ATTITUDES, ATTITUDE_LABEL, LORE_TYPES, PLACE_TYPES, imagesToDiscard, kindInfo } from '@/lib/codex'
import { discardImages, imageUrl, uploadImage } from '@/lib/codexImages'
import { play } from '@/lib/sfx'
import { readableError } from '@/lib/supabase'
import type { CodexDetails, CodexEntry } from '@/types/codex'
import { GalleryPicker } from './GalleryPicker'
import { RelatedPicker } from './RelatedPicker'

type DamageKey = 'vulnerabilities' | 'resistances' | 'immunities'
const DAMAGE_GROUPS: [DamageKey, string][] = [['vulnerabilities', 'Vulnerable to'], ['resistances', 'Resistant to'], ['immunities', 'Immune to']]

/**
 * The page in edit mode. A local draft, written on Save, dropped on Cancel.
 * Uploads happen at once (so the preview is real). Every upload the entry does
 * not end up using is deleted from Storage on every way out: Cancel, Delete,
 * an upload that lands after the editor closed, and an unmount. On Save the
 * replaced images go to the store, which deletes them once the write has landed.
 */
export function CodexEditor({ initial, isNew, entries, cancelRef, onSave, onCancel, onDelete }: {
  initial: CodexEntry
  isNew: boolean
  entries: CodexEntry[]
  cancelRef: MutableRefObject<(() => void) | null>
  onSave: (entry: CodexEntry, discardAfter: string[]) => void
  onCancel: () => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState<CodexEntry>(initial)
  const [uploaded, setUploaded] = useState<string[]>([])
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [showGallery, setShowGallery] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const bar = useRef<HTMLDivElement>(null)
  const confirmShown = useRef(false)
  /** Uploads of this session not yet handed to the store (mirrors `uploaded`, readable from cleanups and late callbacks). */
  const uploadedRef = useRef<string[]>([])
  const busyRef = useRef(false)
  const closedRef = useRef(false)
  const file = useRef<HTMLInputElement>(null)
  const info = kindInfo(draft.kind)

  // Delete swaps itself for Keep / Delete in the same slot: without this the focused button
  // unmounts and the keyboard falls back to the page. Land on Keep (the safe answer), and back on Delete.
  useEffect(() => {
    if (confirmShown.current === confirmDelete) return
    confirmShown.current = confirmDelete
    bar.current?.querySelectorAll<HTMLElement>('.btn')[confirmDelete ? 1 : 0]?.focus()
  }, [confirmDelete])

  /** Deletes this session's uploads not handed to the store; safe to call twice. */
  const releaseUploads = () => {
    discardImages(uploadedRef.current)
    uploadedRef.current = []
  }
  // Any way out that is not Save or Delete (a click on the header, another section, a sign-out) unmounts
  // the editor: its uploads go too, and a late upload is discarded when it lands (see onFile).
  useEffect(() => {
    closedRef.current = false
    return () => {
      closedRef.current = true
      releaseUploads() // touches refs only, so this first-render closure is current
    }
  }, [])

  // Focus the first text field (Name) when the editor opens.
  useEffect(() => {
    root.current?.querySelector<HTMLInputElement>('input:not([type="file"])')?.focus()
  }, [])

  const patch = (p: Partial<CodexEntry>) => setDraft((d) => ({ ...d, ...p }))
  const setDetail = (key: keyof CodexDetails, value: string | string[]) =>
    setDraft((d) => {
      const details: CodexDetails = { ...d.details }
      ;(details as Record<string, string | string[]>)[key] = value
      return { ...d, details }
    })

  const cancel = () => {
    closedRef.current = true
    releaseUploads()
    onCancel()
  }
  cancelRef.current = cancel

  const save = () => {
    if (busyRef.current) return
    closedRef.current = true
    const discardAfter = imagesToDiscard(initial.image, draft.image, uploadedRef.current)
    uploadedRef.current = [] // handed to the store: it deletes them once the write has landed
    onSave({ ...draft, name: draft.name.trim() || 'Unnamed' }, discardAfter)
  }

  const remove = () => {
    closedRef.current = true
    releaseUploads() // the entry's stored image is discarded by the store once the delete lands
    onDelete()
  }

  const onFile = async (picked: File | undefined) => {
    if (!picked || busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setImageError(null)
    try {
      const { image, preview: dataUrl } = await uploadImage(picked, draft.kind)
      if (closedRef.current) {
        discardImages([image]) // the editor closed while this was uploading: nobody will use it
        return
      }
      uploadedRef.current = [...uploadedRef.current, image]
      setUploaded((list) => [...list, image])
      setPreview(dataUrl)
      patch({ image })
      setShowGallery(false)
      play('confirm')
    } catch (err) {
      if (!closedRef.current) {
        setImageError(readableError(err))
        play('error')
      }
    } finally {
      busyRef.current = false
      if (!closedRef.current) setBusy(false)
      if (file.current) file.current.value = ''
    }
  }

  const shownImage = preview && draft.image === uploaded[uploaded.length - 1] ? preview : imageUrl(draft.image, draft.kind)
  const damage = (key: DamageKey) => draft.details[key] ?? []
  const toggleDamage = (key: DamageKey, type: string) =>
    setDetail(key, damage(key).includes(type) ? damage(key).filter((x) => x !== type) : [...damage(key), type])

  return (
    <div className="quest-page cx-editor" data-shape={info.shape} ref={root}>
      <h2 id="cx-page-title" className="qp-title">{isNew ? `New ${info.singular}` : `Edit ${draft.name || 'entry'}`}</h2>
      <div className="qp-rule" />
      <div className="cx-editor-grid">
        <div className="cx-image-block">
          <span className="cx-plate"><img src={shownImage} alt="" /></span>
          <div className="cx-image-actions">
            <Button variant="small" onClick={() => { if (!busyRef.current) file.current?.click() }}>Upload</Button>
            <Button variant="small" onClick={() => setShowGallery((v) => !v)}>Gallery</Button>
            {draft.image && (
              <Button variant="small ghost" cue="back" onClick={() => { patch({ image: null }); setPreview(null) }}>Remove</Button>
            )}
          </div>
          <input ref={file} type="file" accept="image/*" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
          {busy && <p className="cx-image-busy" role="status">Uploading…</p>}
          {imageError && <p className="cx-image-error" role="alert">{imageError}</p>}
          {showGallery && (
            <GalleryPicker
              kind={draft.kind}
              current={draft.image}
              onPick={(path) => {
                patch({ image: path })
                setPreview(null)
                setShowGallery(false)
              }}
            />
          )}
        </div>

        <div className="cx-editor-fields">
          <div className="cx-editor-row">
            <TextField label="Name" value={draft.name} onChange={(v) => patch({ name: v })} />
            <TextField label={info.subtitleLabel} value={draft.subtitle} onChange={(v) => patch({ subtitle: v })} />
          </div>
          <div className="cx-editor-row">
            {info.hasAttitude && (
              <SelectField
                label="Attitude"
                value={ATTITUDE_LABEL[draft.attitude ?? 'unknown']}
                options={ATTITUDES.map((a) => ATTITUDE_LABEL[a])}
                onChange={(v) => patch({ attitude: ATTITUDES.find((a) => ATTITUDE_LABEL[a] === v) ?? 'unknown' })}
              />
            )}
            {info.statuses.length > 0 && (
              <SelectField label="Status" value={draft.status ?? info.statuses[0]} options={info.statuses} onChange={(v) => patch({ status: v })} />
            )}
          </div>

          {draft.kind === 'npc' && (
            <TextField label="Met at" value={draft.details.metAt ?? ''} onChange={(v) => setDetail('metAt', v)} />
          )}
          {draft.kind === 'place' && (
            <div className="cx-editor-row">
              <SelectField label="Place type" value={draft.details.placeType ?? ''} options={PLACE_TYPES} onChange={(v) => setDetail('placeType', v)} />
              <TextField label="First visited" value={draft.details.firstVisited ?? ''} onChange={(v) => setDetail('firstVisited', v)} />
            </div>
          )}
          {draft.kind === 'faction' && (
            <TextField label="Known goal" value={draft.details.goal ?? ''} onChange={(v) => setDetail('goal', v)} />
          )}
          {draft.kind === 'creature' && (
            <>
              <SelectField label="Creature type" value={draft.details.creatureType ?? ''} options={CREATURE_TYPES} onChange={(v) => setDetail('creatureType', v)} />
              {DAMAGE_GROUPS.map(([key, label]) => (
                <fieldset key={key} className="cx-damage">
                  <legend className="label">{label}</legend>
                  <div className="cx-chips">
                    {DAMAGE_TYPES.map((t) => (
                      <Chip key={t} on={damage(key).includes(t)} onToggle={() => toggleDamage(key, t)}>{t}</Chip>
                    ))}
                  </div>
                </fieldset>
              ))}
            </>
          )}
          {draft.kind === 'lore' && (
            <SelectField label="Type" value={draft.details.loreType ?? ''} options={LORE_TYPES} onChange={(v) => setDetail('loreType', v)} />
          )}

          <TextAreaField label="Notes" rows={6} value={draft.notes} onChange={(v) => patch({ notes: v })} placeholder="What the party knows" />
          <RelatedPicker value={draft.related} entries={entries} selfId={draft.id} onChange={(related) => patch({ related })} />
        </div>
      </div>

      <div className="cx-editor-bar" ref={bar}>
        {!isNew && !confirmDelete && (
          <Button variant="small danger" onClick={() => setConfirmDelete(true)}>Delete</Button>
        )}
        {confirmDelete && (
          <>
            <span className="cx-confirm">Delete for everyone?</span>
            <Button variant="small danger" cue="back" onClick={remove}>Delete</Button>
            <Button variant="small" onClick={() => setConfirmDelete(false)}>Keep</Button>
          </>
        )}
        <span className="cx-spacer" />
        <Button variant="small ghost" cue="back" onClick={cancel}>Cancel</Button>
        <Button variant="primary" cue="confirm" onClick={save}>{busy ? 'Uploading…' : 'Save'}</Button>
      </div>
    </div>
  )
}
