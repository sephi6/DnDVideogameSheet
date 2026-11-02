/**
 * Shrinks an image before storing it.
 *
 * Sheet portraits travel as a data-url inside the jsonb, so a photo of several
 * megabytes would bloat the row and be resent whole on every save. Codex images
 * are uploaded to Storage (or kept as a data-url in local mode). Both are
 * resized to the largest size the interface shows and recompressed.
 */
export type ImageProfile = 'portrait' | 'landscape'

const SIZES: Record<ImageProfile, { w: number; h: number }> = {
  portrait: { w: 1000, h: 1400 },
  landscape: { w: 1600, h: 900 },
}
const QUALITY = 0.85

export async function downscaleImage(file: File, profile: ImageProfile = 'portrait'): Promise<string> {
  const { w: MAX_W, h: MAX_H } = SIZES[profile]
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_W / bitmap.width, MAX_H / bitmap.height)
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('This browser cannot process the image.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  // WebP when possible; JPEG otherwise.
  const webp = canvas.toDataURL('image/webp', QUALITY)
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', QUALITY)
}
