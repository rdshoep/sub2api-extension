export type OverviewRange = 'today' | '24h' | '7d'

export interface OverviewRangeQuery {
  start_date: string
  end_date: string
  granularity: 'hour' | 'day'
  label: string
  opsTimeRange: '24h' | '6h' | '1h'
}

export function formatYmd(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function overviewRangeQuery(range: OverviewRange, timeZone: string, now = new Date()): OverviewRangeQuery {
  const today = formatYmd(now, timeZone)
  if (range === 'today') {
    return { start_date: today, end_date: today, granularity: 'hour', label: 'today', opsTimeRange: '24h' }
  }
  if (range === '24h') {
    const start = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    return {
      start_date: formatYmd(start, timeZone),
      end_date: today,
      granularity: 'hour',
      label: '24h',
      opsTimeRange: '24h',
    }
  }
  const start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000)
  return {
    start_date: formatYmd(start, timeZone),
    end_date: today,
    granularity: 'day',
    label: '7d',
    opsTimeRange: '24h',
  }
}

export const OVERVIEW_RANGES: Array<{ id: OverviewRange; labelKey: 'range.today' | 'range.24h' | 'range.7d' }> = [
  { id: 'today', labelKey: 'range.today' },
  { id: '24h', labelKey: 'range.24h' },
  { id: '7d', labelKey: 'range.7d' },
]
