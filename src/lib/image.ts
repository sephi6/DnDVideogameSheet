/**
 * Shrinks an image before storing it in the sheet.
 *
 * The portrait travels as a data-url inside the jsonb, so a photo of several
 * megabytes would bloat the row and be resent whole on every save. It is
 * resized to the card size the interface uses and recompressed.
 */
const MAX_W = 1000
const MAX_H = 1400
const QUALITY = 0.85

export async function downscaleImage(file: File): Promise<string> {
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
