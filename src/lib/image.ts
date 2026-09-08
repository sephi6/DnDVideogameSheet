/**
 * Reduce una imagen antes de guardarla en la ficha.
 *
 * El retrato viaja como data-url dentro del jsonb, así que una foto de varios
 * megas engordaría la fila y se reenviaría entera en cada guardado. Se
 * redimensiona al tamaño de carta que usa la interfaz y se recomprime.
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
  if (!ctx) throw new Error('El navegador no permite procesar la imagen.')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  // WebP cuando se puede; si no, JPEG.
  const webp = canvas.toDataURL('image/webp', QUALITY)
  return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', QUALITY)
}
