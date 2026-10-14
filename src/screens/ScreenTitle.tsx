/**
 * Tier 1 of the section-header card: the screen title printed inside the
 * cartouche of filigree-corners.html. Stroke-only, tinted from --gold by CSS.
 */
export function ScreenTitle({ children }: { children: string }) {
  return (
    <div className="screen-title">
      <svg className="orn" viewBox="0 0 320 44" aria-hidden="true">
        <g strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke">
          <path d="M18 3 H302 L317 22 L302 41 H18 L3 22 Z" />
          <path d="M24 9 H298 L308 22 L298 35 H24 L14 22 Z" opacity=".55" />
        </g>
      </svg>
      <h1>{children}</h1>
    </div>
  )
}
