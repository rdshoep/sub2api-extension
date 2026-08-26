import type {
  AggregatedOverview,
  ModelStatRow,
  NormalizedAccount,
  PartialFailure,
  QuotaAggregate,
  TodaySnapshot,
  TrendPoint,
  UserTrendSeries,
} from './models'

export interface InstanceResult<T> {
  connectionId: string
  connectionName?: string
  ok: boolean
  data?: T
  error?: { message: string; code?: string | number }
}

export function aggregateTodaySnapshots(
  results: InstanceResult<TodaySnapshot>[],
  timezone: string,
  date: string,
): AggregatedOverview {
  const snapshots: TodaySnapshot[] = []
  const failures: PartialFailure[] = []
  for (const result of results) {
    if (result.ok && result.data) {
      snapshots.push(result.data)
    } else {
      failures.push({
        connectionId: result.connectionId,
        connectionName: result.connectionName,
        message: result.error?.message || 'Instance request failed',
        code: result.error?.code,
      })
    }
  }

  const models = new Map<string, ModelStatRow>()
  const trendMap = new Map<string, TrendPoint>()
  const seriesMap = new Map<string, UserTrendSeries>()
  let requests = 0
  let tokens = 0
  let actualCost = 0
  let accountCost = 0
  let errorCount = 0
  let rpm = 0
  let tpm = 0
  let normalAccounts = 0
  let rateLimitedAccounts = 0
  let errorAccounts = 0
  for (const snap of snapshots) {
    requests += snap.requests
    tokens += snap.tokens
    actualCost += snap.actualCost
    accountCost += snap.accountCost ?? 0
    errorCount += snap.errorCount ?? 0
    rpm += snap.rpm ?? 0
    tpm += snap.tpm ?? 0
    normalAccounts += snap.normalAccounts ?? 0
    rateLimitedAccounts += snap.rateLimitedAccounts ?? 0
    errorAccounts += snap.errorAccounts ?? 0
    for (const row of snap.models) {
      const prev = models.get(row.model) ?? { model: row.model, requests: 0, tokens: 0, actualCost: 0 }
      prev.requests += row.requests
      prev.tokens += row.tokens
      prev.actualCost += row.actualCost
      models.set(row.model, prev)
    }
    for (const point of snap.trend ?? []) {
      const prev = trendMap.get(point.at) ?? { at: point.at, tokens: 0, requests: 0 }
      prev.tokens += point.tokens
      prev.requests += point.requests
      trendMap.set(point.at, prev)
    }
    for (const series of snap.userSeries ?? []) {
      const uid = `${snap.connectionId}:${series.uid}`
      const current = seriesMap.get(uid) ?? { uid, label: series.label, points: [] }
      const byAt = new Map(current.points.map((p) => [p.at, p]))
      for (const point of series.points) {
        const prev = byAt.get(point.at) ?? { at: point.at, tokens: 0, requests: 0 }
        prev.tokens += point.tokens
        prev.requests += point.requests
        byAt.set(point.at, prev)
      }
      current.points = [...byAt.values()].sort((a, b) => a.at.localeCompare(b.at))
      seriesMap.set(uid, current)
    }
  }

  return {
    timezone,
    date,
    requests,
    tokens,
    actualCost,
    accountCost,
    errorCount,
    errorRate: requests > 0 ? errorCount / requests : 0,
    rpm,
    tpm,
    normalAccounts,
    rateLimitedAccounts,
    errorAccounts,
    models: [...models.values()].sort((a, b) => b.tokens - a.tokens || b.requests - a.requests),
    trend: [...trendMap.values()].sort((a, b) => a.at.localeCompare(b.at)),
    userSeries: [...seriesMap.values()].sort((a, b) => {
      const ta = a.points.reduce((n, p) => n + p.tokens, 0)
      const tb = b.points.reduce((n, p) => n + p.tokens, 0)
      return tb - ta
    }),
    snapshots,
    failures,
  }
}

export function aggregateQuotaWindows(accounts: NormalizedAccount[]): QuotaAggregate {
  let criticalCount = 0
  let lowestRemaining: number | null = null
  let nearestResetAt: string | null = null
  let nearestTs = Number.POSITIVE_INFINITY

  for (const account of accounts) {
    const accountCritical = account.quotaWindows.some(
      (window) => window.state === 'critical' || window.state === 'exhausted' || window.state === 'over-limit',
    )
    if (accountCritical) criticalCount += 1
    for (const window of account.quotaWindows) {
      if (typeof window.remainingPercent === 'number') {
        lowestRemaining = lowestRemaining == null ? window.remainingPercent : Math.min(lowestRemaining, window.remainingPercent)
      }
      if (window.resetAt) {
        const ts = Date.parse(window.resetAt)
        if (!Number.isNaN(ts) && ts < nearestTs) {
          nearestTs = ts
          nearestResetAt = window.resetAt
        }
      }
    }
  }

  return { criticalCount, lowestRemaining, nearestResetAt }
}

export async function allSettledMap<T>(
  items: Array<{ id: string; name?: string }>,
  worker: (id: string) => Promise<T>,
  timeoutMs = 15_000,
): Promise<InstanceResult<T>[]> {
  const wrapped = items.map(async (item) => {
    const timer = AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined
    const timeout = new Promise<never>((_, reject) => {
      const id = setTimeout(() => reject(Object.assign(new Error('Instance timeout'), { code: 'TIMEOUT' })), timeoutMs)
      timer?.addEventListener('abort', () => clearTimeout(id))
    })
    try {
      const data = await Promise.race([worker(item.id), timeout])
      return { connectionId: item.id, connectionName: item.name, ok: true as const, data }
    } catch (error) {
      const err = error as { message?: string; code?: string | number }
      return {
        connectionId: item.id,
        connectionName: item.name,
        ok: false as const,
        error: { message: err.message || 'Request failed', code: err.code },
      }
    }
  })
  return Promise.all(wrapped)
}
