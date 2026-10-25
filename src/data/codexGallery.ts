import type { CodexKind } from '@/types/codex'

/** An illustration shipped with the app, pickable from the codex editor. */
export interface GalleryImage {
  /** Relative path under public/: `assets/codex/<kind>-<slug>.webp`. */
  path: string
  kind: CodexKind
  label: string
}

/**
 * Repo illustrations in public/assets/codex/. Adding one is "drop the file, add
 * one line"; docs/CODEX_ASSETS.md explains how they are generated and processed.
 */
export const CODEX_GALLERY: GalleryImage[] = []

export function galleryFor(kind: CodexKind): GalleryImage[] {
  return CODEX_GALLERY.filter((g) => g.kind === kind)
}
