import { compositeUid, type NormalizedAccount, type NormalizedError, type NormalizedUser, type QuotaWindow, type TodaySnapshot, type UserTrendSeries } from '@/domain/models'
import { quotaWindowFromUsdLimit, quotaWindowFromUsageProgress } from '@/domain/quota'
import { redactSecrets } from '@/core/security/redact'

export interface RawAccount {
  id: number
  name: string
  platform: string
  status: string
  schedulable?: boolean
  groups?: Array<{ name?: string }>
  group_ids?: number[]
  updated_at?: string
}

export interface RawUsageInfo {
  source?: 'passive' | 'active'
  updated_at?: string | null
  five_hour?: Record<string, unknown> | null
  seven_day?: Record<string, unknown> | null
  seven_day_sonnet?: Record<string, unknown> | null
  gemini_shared_daily?: Record<string, unknown> | null
  grok_request_quota?: { remaining?: number | null; limit?: number | null; reset_at?: string | null } | null
  [key: string]: unknown
}

export interface RawUser {
  id: number
  email: string
  username: string
  balance: number
  status: string
  last_active_at?: string | null
  last_used_at?: string | null
}

export interface RawPlatformQuota {
  platform: string
  daily_limit_usd: number | null
  weekly_limit_usd: number | null
  monthly_limit_usd: number | null
  daily_usage_usd: number
  weekly_usage_usd: number
  monthly_usage_usd: number
  daily_window_resets_at?: string | null
  weekly_window_resets_at?: string | null
  monthly_window_resets_at?: string | null
}

export interface RawDashboardStats {
  today_requests?: number
  today_tokens?: number
  today_actual_cost?: number
  today_account_cost?: number
  rpm?: number
  tpm?: number
  normal_accounts?: number
  ratelimit_accounts?: number
  error_accounts?: number
  stats_updated_at?: string
}

export interface RawModelStat {
  model: string
  requests: number
  total_tokens?: number
  actual_cost?: number
  account_cost?: number
}

export interface RawErrorLog {
  id: number
  created_at: string
  status_code?: number
  platform?: string
  model?: string
  account_name?: string
  user_email?: string
  message?: string
  error_body?: string
}

const WINDOW_PRIORITY: Record<string, Array<{ key: string; id: string; label: string }>> = {
  openai: [
    { key: 'five_hour', id: 'five-hour', label: '5h' },
    { key: 'seven_day', id: 'seven-day', label: '7d' },
  ],
  anthropic: [
    { key: 'five_hour', id: 'five-hour', label: '5h' },
    { key: 'seven_day', id: 'seven-day', label: '7d' },
  ],
  gemini: [
    { key: 'gemini_shared_daily', id: 'gemini-daily', label: '日配额' },
    { key: 'five_hour', id: 'five-hour', label: '5h' },
  ],
  grok: [
    { key: 'five_hour', id: 'five-hour', label: '5h' },
    { key: 'seven_day', id: 'seven-day', label: '7d' },
  ],
  antigravity: [
    { key: 'five_hour', id: 'five-hour', label: '5h' },
    { key: 'seven_day', id: 'seven-day', label: '7d' },
  ],
}

export function preferredWindowsForPlatform(platform: string): Array<{ key: string; id: string; label: string }> {
  return WINDOW_PRIORITY[platform] ?? WINDOW_PRIORITY.openai
}

export function normalizeAccount(connectionId: string, raw: RawAccount, usage?: RawUsageInfo | null): NormalizedAccount {
  const windows = usage
    ? normalizeUsageWindows(raw.platform, usage)
    : []
  return {
    uid: compositeUid(connectionId, raw.id),
    connectionId,
    id: raw.id,
    name: raw.name,
    upstreamPlatform: raw.platform,
    status: raw.status,
    schedulable: raw.schedulable,
    group: raw.groups?.[0]?.name,
    quotaWindows: windows,
    updatedAt: usage?.updated_at ?? raw.updated_at ?? null,
    usageSource: usage?.source,
    raw,
  }
}

export function normalizeUsageWindows(platform: string, usage: RawUsageInfo): QuotaWindow[] {
  const preferred = preferredWindowsForPlatform(platform)
  return preferred.map((spec) =>
    quotaWindowFromUsageProgress({
      id: spec.id,
      label: spec.label,
      progress: (usage[spec.key] as { utilization?: number } | null | undefined) ?? null,
      updatedAt: usage.updated_at,
      source: usage.source ?? 'passive',
    }),
  )
}

export function normalizeUser(connectionId: string, raw: RawUser, todayActualCost?: number): NormalizedUser {
  return {
    uid: compositeUid(connectionId, raw.id),
    connectionId,
    id: raw.id,
    email: raw.email,
    username: raw.username,
    balance: raw.balance,
    status: raw.status,
    todayActualCost,
    lastActiveAt: raw.last_active_at ?? raw.last_used_at ?? null,
    raw,
  }
}

export function normalizePlatformQuotas(items: RawPlatformQuota[]): QuotaWindow[] {
  const windows: QuotaWindow[] = []
  for (const item of items) {
    windows.push(
      quotaWindowFromUsdLimit({
        id: `${item.platform}:daily`,
        label: `${item.platform} 日`,
        usedUsd: item.daily_usage_usd,
        limitUsd: item.daily_limit_usd,
        resetAt: item.daily_window_resets_at,
      }),
      quotaWindowFromUsdLimit({
        id: `${item.platform}:weekly`,
        label: `${item.platform} 周`,
        usedUsd: item.weekly_usage_usd,
        limitUsd: item.weekly_limit_usd,
        resetAt: item.weekly_window_resets_at,
      }),
      quotaWindowFromUsdLimit({
        id: `${item.platform}:monthly`,
        label: `${item.platform} 月`,
        usedUsd: item.monthly_usage_usd,
        limitUsd: item.monthly_limit_usd,
        resetAt: item.monthly_window_resets_at,
      }),
    )
  }
  return windows
}

export function normalizeTodaySnapshot(input: {
  connectionId: string
  timezone: string
  stats?: RawDashboardStats
  models?: RawModelStat[]
  generatedAt?: string
  startDate?: string
  errorCount?: number
  errorRate?: number
  requests?: number
  tokens?: number
  actualCost?: number
  accountCost?: number
  trend?: Array<{ date?: string; requests?: number; total_tokens?: number }>
  usersTrend?: Array<{ date?: string; user_id?: number; email?: string; username?: string; tokens?: number; requests?: number }>
}): TodaySnapshot {
  const stats = input.stats ?? {}
  const date = (input.startDate || input.generatedAt || new Date().toISOString()).slice(0, 10)
  return {
    connectionId: input.connectionId,
    date,
    timezone: input.timezone,
    requests: input.requests ?? stats.today_requests ?? 0,
    tokens: input.tokens ?? stats.today_tokens ?? 0,
    actualCost: input.actualCost ?? stats.today_actual_cost ?? 0,
    accountCost: input.accountCost ?? stats.today_account_cost ?? 0,
    errorCount: input.errorCount,
    errorRate: input.errorRate,
    rpm: stats.rpm,
    tpm: stats.tpm,
    normalAccounts: stats.normal_accounts,
    rateLimitedAccounts: stats.ratelimit_accounts,
    errorAccounts: stats.error_accounts,
    models: (input.models ?? []).map((m) => ({
      model: m.model,
      requests: m.requests,
      tokens: m.total_tokens ?? 0,
      actualCost: m.actual_cost ?? 0,
    })),
    trend: (input.trend ?? []).map((p, i) => ({
      at: p.date || `${date}T${String(i).padStart(2, '0')}:00:00`,
      tokens: p.total_tokens ?? 0,
      requests: p.requests ?? 0,
    })),
    userSeries: groupUsersTrend(input.connectionId, input.usersTrend ?? []),
    fetchedAt: input.generatedAt || new Date().toISOString(),
  }
}

export function groupUsersTrend(
  _connectionId: string,
  rows: Array<{ date?: string; user_id?: number; email?: string; username?: string; tokens?: number; requests?: number }>,
): UserTrendSeries[] {
  const map = new Map<string, UserTrendSeries>()
  for (const row of rows) {
    const id = String(row.user_id ?? row.email ?? 'unknown')
    const series = map.get(id) ?? {
      uid: id,
      label: row.username?.trim() || row.email?.trim() || `user ${id}`,
      points: [],
    }
    series.points.push({
      at: row.date || new Date().toISOString(),
      tokens: row.tokens ?? 0,
      requests: row.requests ?? 0,
    })
    map.set(id, series)
  }
  return [...map.values()].map((s) => ({
    ...s,
    points: s.points.sort((a, b) => a.at.localeCompare(b.at)),
  }))
}

export function normalizeError(
  connectionId: string,
  kind: 'request' | 'upstream',
  raw: RawErrorLog,
  includeDetail = false,
): NormalizedError {
  const message = raw.message || ''
  return {
    uid: compositeUid(connectionId, `${kind}:${raw.id}`),
    connectionId,
    id: raw.id,
    kind,
    createdAt: raw.created_at,
    statusCode: raw.status_code,
    platform: raw.platform,
    model: raw.model,
    accountName: raw.account_name,
    userEmail: raw.user_email,
    message: redactSecrets(message),
    summary: redactSecrets(message).slice(0, 180),
    detail: includeDetail ? redactSecrets(raw.error_body || '') : undefined,
  }
}
