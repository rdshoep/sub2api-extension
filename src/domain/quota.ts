import { getLocale, t } from '@/i18n'
import type { QuotaSource, QuotaState, QuotaWindow } from './models'

export const DEFAULT_FRESHNESS_MS = 15 * 60 * 1000

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

export function utilizationToRemaining(utilization: number | null | undefined): {
  remainingPercent: number | undefined
  usedPercent: number | undefined
  overLimit: boolean
  stateHint: 'unknown' | 'exhausted' | 'over-limit' | 'ok'
} {
  if (utilization === null || utilization === undefined || Number.isNaN(Number(utilization))) {
    return { remainingPercent: undefined, usedPercent: undefined, overLimit: false, stateHint: 'unknown' }
  }
  const used = Number(utilization)
  const remaining = clamp(100 - used, 0, 100)
  if (used > 100) {
    return { remainingPercent: 0, usedPercent: used, overLimit: true, stateHint: 'over-limit' }
  }
  if (remaining <= 0) {
    return { remainingPercent: 0, usedPercent: used, overLimit: false, stateHint: 'exhausted' }
  }
  return { remainingPercent: remaining, usedPercent: used, overLimit: false, stateHint: 'ok' }
}

export function stateFromRemaining(
  remaining: number | undefined,
  opts: { overLimit?: boolean; stale?: boolean; unlimited?: boolean; unknown?: boolean } = {},
): QuotaState {
  if (opts.unknown) return 'unknown'
  if (opts.unlimited) return 'unlimited'
  if (opts.stale) return 'stale'
  if (opts.overLimit) return 'over-limit'
  if (remaining === undefined) return 'unknown'
  if (remaining <= 0) return 'exhausted'
  if (remaining < 15) return 'critical'
  if (remaining < 40) return 'warning'
  return 'healthy'
}

export function isStale(updatedAt: string | null | undefined, now = Date.now(), freshnessMs = DEFAULT_FRESHNESS_MS): boolean {
  if (!updatedAt) return false
  const ts = Date.parse(updatedAt)
  if (Number.isNaN(ts)) return false
  return now - ts > freshnessMs
}

export interface UsageProgressLike {
  utilization?: number | null
  resets_at?: string | null
  remaining_seconds?: number | null
  used_requests?: number
  limit_requests?: number | null
  window_stats?: unknown
}

export function quotaWindowFromUsageProgress(input: {
  id: string
  label: string
  progress: UsageProgressLike | null | undefined
  updatedAt?: string | null
  source?: QuotaSource
  now?: number
  freshnessMs?: number
}): QuotaWindow {
  const { id, label, progress, updatedAt, source = 'passive', now, freshnessMs } = input
  if (progress == null) {
    return {
      id,
      label,
      source,
      updatedAt: updatedAt ?? null,
      state: 'unknown',
    }
  }
  const stale = isStale(updatedAt, now, freshnessMs)
  const conv = utilizationToRemaining(progress.utilization)
  const unknown = conv.stateHint === 'unknown'
  const state = stateFromRemaining(conv.remainingPercent, {
    overLimit: conv.overLimit,
    stale: stale && !unknown,
    unknown,
  })
  return {
    id,
    label,
    usedPercent: conv.usedPercent,
    remainingPercent: conv.remainingPercent,
    used: progress.used_requests,
    limit: progress.limit_requests,
    unit: 'percent',
    resetAt: progress.resets_at ?? null,
    remainingSeconds: progress.remaining_seconds ?? null,
    source,
    updatedAt: updatedAt ?? null,
    state,
    overLimit: conv.overLimit,
  }
}

export function quotaWindowFromUsdLimit(input: {
  id: string
  label: string
  usedUsd: number
  limitUsd: number | null | undefined
  resetAt?: string | null
  source?: QuotaSource
  updatedAt?: string | null
}): QuotaWindow {
  const { id, label, usedUsd, limitUsd, resetAt, source = 'local', updatedAt } = input
  if (limitUsd === null || limitUsd === undefined) {
    return {
      id,
      label,
      used: usedUsd,
      limit: null,
      unit: 'usd',
      resetAt: resetAt ?? null,
      source,
      updatedAt: updatedAt ?? null,
      state: 'unlimited',
    }
  }
  if (limitUsd <= 0) {
    return {
      id,
      label,
      used: usedUsd,
      limit: limitUsd,
      unit: 'usd',
      resetAt: resetAt ?? null,
      source,
      updatedAt: updatedAt ?? null,
      state: 'unknown',
    }
  }
  const usedPercent = (usedUsd / limitUsd) * 100
  const conv = utilizationToRemaining(usedPercent)
  const state = stateFromRemaining(conv.remainingPercent, { overLimit: conv.overLimit })
  return {
    id,
    label,
    usedPercent: conv.usedPercent,
    remainingPercent: conv.remainingPercent,
    used: usedUsd,
    limit: limitUsd,
    unit: 'usd',
    resetAt: resetAt ?? null,
    source,
    updatedAt: updatedAt ?? null,
    state,
    overLimit: conv.overLimit,
  }
}

export function quotaDisplay(window: QuotaWindow): { primary: string; caption: string; stateLabel: string } {
  const stateLabel = quotaStateLabel(window.state, window.overLimit)
  if (window.state === 'unlimited') {
    return { primary: '∞', caption: t('quota.unlimited'), stateLabel }
  }
  if (window.state === 'unknown') {
    return { primary: '—', caption: t('quota.unknown'), stateLabel }
  }
  if (window.state === 'stale') {
    return {
      primary: window.remainingPercent != null ? `${Math.round(window.remainingPercent)}%` : '—',
      caption: t('quota.stale'),
      stateLabel,
    }
  }
  if (window.remainingPercent == null) {
    return { primary: '—', caption: t('quota.unknown'), stateLabel }
  }
  return {
    primary: `${Math.round(window.remainingPercent)}%`,
    caption: '',
    stateLabel,
  }
}

/** Seconds until the quota window refreshes. Prefers a future resetAt, else remainingSeconds. */
export function resetRemainingSeconds(input: {
  remainingSeconds?: number | null
  resetAt?: string | null
  now?: number
}): number | null {
  const now = input.now ?? Date.now()
  if (input.resetAt) {
    const ts = Date.parse(input.resetAt)
    if (!Number.isNaN(ts)) {
      const fromAt = Math.max(0, Math.floor((ts - now) / 1000))
      if (fromAt > 0) return fromAt
    }
  }
  if (input.remainingSeconds == null || Number.isNaN(Number(input.remainingSeconds))) {
    if (input.resetAt && !Number.isNaN(Date.parse(input.resetAt))) return 0
    return null
  }
  return Math.max(0, Math.floor(Number(input.remainingSeconds)))
}

export function formatResetRemaining(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return ''
  if (seconds <= 0) return t('quota.refreshSoon')
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (getLocale() === 'en') {
    if (d > 0) return h ? `${d}d ${h}h` : `${d}d`
    if (h > 0) return m ? `${h}h ${m}m` : `${h}h`
    if (m > 0) return `${m}m`
    return `${seconds}s`
  }
  if (d > 0) return h ? `${d}天${h}小时` : `${d}天`
  if (h > 0) return m ? `${h}小时${m}分` : `${h}小时`
  if (m > 0) return `${m}分钟`
  return `${seconds}秒`
}

export function quotaWindowLabel(window: QuotaWindow): string {
  if (window.id.endsWith(':daily')) return `${window.id.split(':')[0]} · ${t('quota.daily')}`
  if (window.id.endsWith(':weekly')) return `${window.id.split(':')[0]} · ${t('quota.weekly')}`
  if (window.id.endsWith(':monthly')) return `${window.id.split(':')[0]} · ${t('quota.monthly')}`
  if (window.id === 'gemini-daily') return t('quota.dailyWindow')
  return window.label
}

export function quotaStateLabel(state: QuotaState, overLimit?: boolean): string {
  if (overLimit || state === 'over-limit') return t('quota.overLimit')
  switch (state) {
    case 'healthy':
      return t('quota.healthy')
    case 'warning':
      return t('quota.warning')
    case 'critical':
      return t('quota.critical')
    case 'exhausted':
      return t('quota.exhausted')
    case 'unlimited':
      return t('quota.unlimited')
    case 'unknown':
      return t('quota.unknown')
    case 'stale':
      return t('quota.stale')
    default:
      return state
  }
}
