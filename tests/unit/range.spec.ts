import { describe, expect, it } from 'vitest'
import { formatYmd, overviewRangeQuery } from '@/domain/range'

describe('overviewRangeQuery', () => {
  const now = new Date('2026-08-26T12:00:00Z')

  it('defaults today to a single date window', () => {
    const q = overviewRangeQuery('today', 'UTC', now)
    expect(q.label).toBe('today')
    expect(q.start_date).toBe('2026-08-26')
    expect(q.end_date).toBe('2026-08-26')
    expect(q.granularity).toBe('hour')
  })

  it('covers 24h and 7d date windows', () => {
    const day = overviewRangeQuery('24h', 'UTC', now)
    expect(day.start_date).toBe(formatYmd(new Date(now.getTime() - 24 * 3600 * 1000), 'UTC'))
    expect(day.end_date).toBe('2026-08-26')
    const week = overviewRangeQuery('7d', 'UTC', now)
    expect(week.granularity).toBe('day')
    expect(week.start_date).toBe(formatYmd(new Date(now.getTime() - 6 * 24 * 3600 * 1000), 'UTC'))
  })
})
