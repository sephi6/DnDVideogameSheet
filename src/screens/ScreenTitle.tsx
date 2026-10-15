/**
 * Tier 1 of the section-header card: the screen title printed inside the
 * cartouche of filigree-corners.html. Stroke-only, tinted from --gold by CSS.
 */
export function ScreenTitle({ children }: { children: string }) {
  return (
    <div className="screen-title">
      <h1>{children}</h1>
    </div>
  )
}
