import type { QuotaState } from './models'

/** Drawn circle in the 72×72 viewBox. Dash math must use this radius, not the CSS size. */
export const RING_VIEWBOX = 72
export const RING_RADIUS = 31

export function ringCircumference(radius = RING_RADIUS): number {
  return 2 * Math.PI * radius
}

export function ringDash(remainingPercent: number | null | undefined, state: QuotaState): {
  dash: number
  gap: number
  full: boolean
  circ: number
} {
  const circ = ringCircumference()
  const hasProgress = remainingPercent != null && Number.isFinite(remainingPercent)
  if (state === 'unknown' || (state === 'stale' && !hasProgress)) {
    return { dash: 0, gap: circ, full: false, circ }
  }
  const pct = state === 'unlimited' ? 100 : Math.max(0, Math.min(100, remainingPercent ?? 0))
  if (pct >= 99.5) {
    return { dash: circ, gap: 0, full: true, circ }
  }
  return { dash: (pct / 100) * circ, gap: circ, full: false, circ }
}
