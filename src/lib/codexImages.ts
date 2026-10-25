import { newId } from '@/data/defaults'
import { imageSource, kindInfo } from '@/lib/codex'
import { downscaleImage } from '@/lib/image'
import { isSupabaseConfigured, requireSupabase } from '@/lib/supabase'
import type { CodexKind } from '@/types/codex'

const BUCKET = 'codex'
const PREFIX = 'codex/'
/** Checked before decoding: a phone photo is a few MB; 20 MB is clearly not one. */
export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024

/** The `src` for an entry's image; the kind's emblem when there is none. */
export function imageUrl(image: string | null, kind: CodexKind): string {
  const fallback = `assets/codex/default-${kind}.svg`
  switch (imageSource(image)) {
    case 'data':
    case 'asset':
      return image as string
    case 'storage':
      if (!isSupabaseConfigured) return fallback
      return requireSupabase().storage.from(BUCKET).getPublicUrl((image as string).slice(PREFIX.length)).data.publicUrl
    default:
      return fallback
  }
}

/**
 * Resizes the file for the kind's card shape, then stores it: uploaded to the
 * `codex` bucket in the cloud (the entry keeps `codex/<uuid>.webp`), or kept as a
 * data-url locally. `preview` is always a data-url, for instant display.
 */
export async function uploadImage(file: File, kind: CodexKind): Promise<{ image: string; preview: string }> {
  if (!file.type.startsWith('image/')) throw new Error('That file is not an image. Choose a PNG, JPEG or WebP.')
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('That image is over 20 MB. Choose a smaller one.')
  const dataUrl = await downscaleImage(file, kindInfo(kind).shape)
  if (!isSupabaseConfigured) return { image: dataUrl, preview: dataUrl }
  const blob = await (await fetch(dataUrl)).blob()
  const name = `${newId()}.${blob.type === 'image/webp' ? 'webp' : 'jpg'}`
  const { error } = await requireSupabase().storage.from(BUCKET).upload(name, blob, {
    contentType: blob.type,
    cacheControl: '31536000',
    upsert: false,
  })
  if (error) throw error
  return { image: `${PREFIX}${name}`, preview: dataUrl }
}

/** Best-effort removal of Storage images nobody uses any more. Failures only log: an orphan file is harmless. */
export function discardImages(images: string[]): void {
  const names = images.filter((i) => imageSource(i) === 'storage').map((i) => i.slice(PREFIX.length))
  if (names.length === 0 || !isSupabaseConfigured) return
  void requireSupabase()
    .storage.from(BUCKET)
    .remove(names)
    .then(({ error }) => {
      if (error) console.warn('[arcana] could not delete codex images', names, error)
    })
}
