import { describe, expect, it } from 'vitest'
import {
  formatResetRemaining,
  quotaDisplay,
  quotaWindowFromUsdLimit,
  quotaWindowFromUsageProgress,
  resetRemainingSeconds,
  utilizationToRemaining,
} from '@/domain/quota'

describe('utilizationToRemaining', () => {
  it('converts 60% used to 40% remaining', () => {
    expect(utilizationToRemaining(60)).toMatchObject({ remainingPercent: 40, overLimit: false })
  })

  it('clamps utilization > 100 to remaining 0 and over-limit', () => {
    expect(utilizationToRemaining(130)).toEqual({ remainingPercent: 0, usedPercent: 130, overLimit: true, stateHint: 'over-limit' })
  })

  it('treats null as unknown, never 0%', () => {
    expect(utilizationToRemaining(null).stateHint).toBe('unknown')
    expect(utilizationToRemaining(null).remainingPercent).toBeUndefined()
  })
})

describe('quotaWindowFromUsageProgress', () => {
  it('maps 5h/7d remaining including over-limit', () => {
    const five = quotaWindowFromUsageProgress({
      id: 'five-hour',
      label: '5h',
      progress: { utilization: 15, resets_at: '2026-08-26T10:00:00Z', remaining_seconds: 60 },
      updatedAt: new Date().toISOString(),
    })
    expect(five.remainingPercent).toBe(85)
    expect(five.state).toBe('healthy')

    const over = quotaWindowFromUsageProgress({
      id: 'seven-day',
      label: '7d',
      progress: { utilization: 120 },
      updatedAt: new Date().toISOString(),
    })
    expect(over.remainingPercent).toBe(0)
    expect(over.state).toBe('over-limit')
    expect(quotaDisplay(over).stateLabel).toBe('超限')
  })

  it('renders null progress as 暂无数据 not 0%', () => {
    const unknown = quotaWindowFromUsageProgress({ id: 'five-hour', label: '5h', progress: null })
    expect(unknown.state).toBe('unknown')
    expect(quotaDisplay(unknown).primary).toBe('—')
    expect(quotaDisplay(unknown).caption).toBe('暂无数据')
  })

  it('marks stale data', () => {
    const stale = quotaWindowFromUsageProgress({
      id: 'five-hour',
      label: '5h',
      progress: { utilization: 10 },
      updatedAt: '2020-01-01T00:00:00Z',
      now: Date.parse('2026-08-26T00:00:00Z'),
    })
    expect(stale.state).toBe('stale')
    expect(stale.remainingPercent).toBe(90)
    expect(quotaDisplay(stale).primary).toBe('90%')
    expect(quotaDisplay(stale).caption).toBe('数据过期')
  })
})

describe('reset remaining', () => {
  it('prefers a future resetAt and falls back to remainingSeconds', () => {
    const now = Date.parse('2026-08-26T01:00:00Z')
    expect(resetRemainingSeconds({ remainingSeconds: 7200, resetAt: '2026-08-26T06:00:00Z', now })).toBe(5 * 3600)
    expect(resetRemainingSeconds({ remainingSeconds: 7200, resetAt: '2020-01-01T00:00:00Z', now })).toBe(7200)
    expect(formatResetRemaining(7200)).toBe('2小时')
    expect(formatResetRemaining(400000)).toBe('4天15小时')
    expect(formatResetRemaining(90)).toBe('1分钟')
    expect(formatResetRemaining(0)).toBe('即将刷新')
  })
})

describe('per-platform QuotaWindow', () => {
  it('maps unlimited usd limit to infinity', () => {
    const w = quotaWindowFromUsdLimit({ id: 'anthropic:monthly', label: '月', usedUsd: 3, limitUsd: null })
    expect(w.state).toBe('unlimited')
    expect(quotaDisplay(w).primary).toBe('∞')
  })

  it('maps daily/weekly/monthly windows from used/limit', () => {
    const w = quotaWindowFromUsdLimit({ id: 'openai:daily', label: '日', usedUsd: 8, limitUsd: 10 })
    expect(w.remainingPercent).toBe(20)
    expect(w.state).toBe('warning')
  })
})
