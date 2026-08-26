import { describe, expect, it } from 'vitest'
import { balanceTone, formatCompactCount, formatMoney, formatTrendAt, sortUsersBySpendThenBalance } from '@/domain/format'

describe('formatCompactCount', () => {
  it('keeps small numbers as integers', () => {
    expect(formatCompactCount(0)).toBe('0')
    expect(formatCompactCount(999)).toBe('999')
  })

  it('uses uppercase K/M/B with two decimals', () => {
    expect(formatCompactCount(1000)).toBe('1.00K')
    expect(formatCompactCount(7000)).toBe('7.00K')
    expect(formatCompactCount(15320)).toBe('15.32K')
    expect(formatCompactCount(1_500_000)).toBe('1.50M')
    expect(formatCompactCount(2_000_000_000)).toBe('2.00B')
  })
})

describe('user ranking and balance tone', () => {
  it('sorts by today spend desc then lowest balance', () => {
    const sorted = sortUsersBySpendThenBalance([
      { todayActualCost: 1, balance: 80 },
      { todayActualCost: 5, balance: 10 },
      { todayActualCost: 5, balance: 3 },
      { todayActualCost: 0, balance: 1 },
    ])
    expect(sorted.map((u) => u.balance)).toEqual([3, 10, 80, 1])
  })

  it('colors low balances', () => {
    expect(balanceTone(4)).toBe('critical')
    expect(balanceTone(20)).toBe('warning')
    expect(balanceTone(50)).toBe('ok')
  })

  it('formats USD with a currency prefix', () => {
    expect(formatMoney(12.5)).toBe('$12.50')
    expect(formatMoney(1.25, 4)).toBe('$1.2500')
    expect(formatMoney(undefined)).toBe('—')
  })
})

describe('formatTrendAt', () => {
  it('renders a readable local timestamp', () => {
    expect(formatTrendAt('2026-08-26T12:00:00Z')).toMatch(/08-26 \d{2}:\d{2}/)
    expect(formatTrendAt('not-a-date')).toBe('not-a-date')
  })
})

