/** Compact count for tokens / TPM: 1.20K, 3.50M, 1.10B. */
export function formatCompactCount(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  if (abs < 1000) return `${sign}${Math.round(abs)}`
  const units: Array<{ size: number; suffix: string }> = [
    { size: 1_000_000_000, suffix: 'B' },
    { size: 1_000_000, suffix: 'M' },
    { size: 1_000, suffix: 'K' },
  ]
  for (const { size, suffix } of units) {
    if (abs >= size) {
      return `${sign}${(abs / size).toFixed(2)}${suffix}`
    }
  }
  return `${sign}${Math.round(abs)}`
}

export function sortUsersBySpendThenBalance<T extends { todayActualCost?: number; balance: number }>(users: T[]): T[] {
  return [...users].sort((a, b) => {
    const spend = (b.todayActualCost ?? 0) - (a.todayActualCost ?? 0)
    if (spend !== 0) return spend
    return a.balance - b.balance
  })
}

export function balanceTone(balance: number): 'critical' | 'warning' | 'ok' {
  if (balance < 5) return 'critical'
  if (balance < 50) return 'warning'
  return 'ok'
}

/** USD display for balances, spend, and overview costs. */
export function formatMoney(n?: number | null, digits = 2): string {
  if (n == null || Number.isNaN(Number(n))) return '—'
  return `$${Number(n).toFixed(digits)}`
}

/** Compact local timestamp for trend tooltips: `08-26 12:00` or `08-26`. */
export function formatTrendAt(at: string): string {
  const date = new Date(at)
  if (Number.isNaN(date.getTime())) return at
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const hh = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  if (hh === '00' && mi === '00' && !/[T ]\d{2}:\d{2}/.test(at)) return `${mm}-${dd}`
  return `${mm}-${dd} ${hh}:${mi}`
}
