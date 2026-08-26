import type {
  AccountListQuery,
  AdapterContext,
  BalanceAdjustInput,
  DeepLinks,
  ErrorListQuery,
  PlatformAdapter,
  ProbeResult,
  UserListQuery,
  UserQuotaResetInput,
} from '@/core/adapters/types'
import { HttpClientError, type TypedHttpClient } from '@/core/http/client'
import type { NormalizedAccount, NormalizedError, NormalizedUser, PlatformConnection, QuotaWindow, TodaySnapshot } from '@/domain/models'
import { overviewRangeQuery, type OverviewRange } from '@/domain/range'
import { BATCH_USAGE_CHUNK, SUB2API_ENDPOINTS } from './endpoints'
import { probeSub2Api } from './capabilities'
import { getSub2ApiDeepLinks } from './deep-links'
import {
  normalizeAccount,
  normalizeError,
  normalizePlatformQuotas,
  normalizeTodaySnapshot,
  normalizeUsageWindows,
  normalizeUser,
  type RawAccount,
  type RawDashboardStats,
  type RawErrorLog,
  type RawModelStat,
  type RawPlatformQuota,
  type RawUsageInfo,
  type RawUser,
} from './normalizers'

interface Paginated<T> {
  items: T[]
  total: number
  page?: number
  page_size?: number
}

export class Sub2ApiAdapter implements PlatformAdapter {
  readonly id = 'sub2api'
  readonly version = 1

  constructor(private readonly http: TypedHttpClient) {}

  private req<T>(ctx: AdapterContext, path: string, init: Partial<Parameters<TypedHttpClient['request']>[0]> = {}) {
    return this.http.request<T>({
      apiBase: ctx.connection.apiBase,
      path,
      auth: ctx.auth,
      timezone: ctx.timezone,
      acceptLanguage: ctx.acceptLanguage,
      signal: ctx.signal,
      timeoutMs: 15_000,
      ...init,
    })
  }

  probeConnection(ctx: AdapterContext): Promise<ProbeResult> {
    return probeSub2Api(this.http, ctx)
  }

  async listAccounts(ctx: AdapterContext, query: AccountListQuery = {}): Promise<{ items: NormalizedAccount[]; total: number }> {
    const res = await this.req<Paginated<RawAccount>>(ctx, SUB2API_ENDPOINTS.accounts, {
      query: {
        page: query.page ?? 1,
        page_size: query.pageSize ?? 50,
        platform: query.platform,
        status: query.status,
        group: query.group,
        search: query.search,
      },
    })
    const items = (res.data.items ?? []).map((raw) => normalizeAccount(ctx.connection.id, raw))
    return { items, total: res.data.total ?? items.length }
  }

  async getAccountQuotaBatch(
    ctx: AdapterContext,
    accountIds: number[],
    opts?: { force?: boolean },
  ): Promise<Record<number, { windows: QuotaWindow[]; source?: string; updatedAt?: string | null; raw?: RawUsageInfo }>> {
    const out: Record<number, { windows: QuotaWindow[]; source?: string; updatedAt?: string | null; raw?: RawUsageInfo }> = {}
    for (let i = 0; i < accountIds.length; i += BATCH_USAGE_CHUNK) {
      const chunk = accountIds.slice(i, i + BATCH_USAGE_CHUNK)
      const res = await this.req<{ usage?: Record<string, RawUsageInfo>; errors?: Record<string, string> }>(
        ctx,
        SUB2API_ENDPOINTS.accountUsageBatch,
        {
          method: 'POST',
          body: { account_ids: chunk, force: opts?.force === true },
        },
      )
      for (const [id, usage] of Object.entries(res.data.usage ?? {})) {
        const numericId = Number(id)
        out[numericId] = {
          windows: normalizeUsageWindows('openai', usage),
          source: usage.source,
          updatedAt: usage.updated_at,
          raw: usage,
        }
      }
    }
    return out
  }

  async refreshAccountQuota(ctx: AdapterContext, accountId: number, opts?: { force?: boolean }): Promise<QuotaWindow[]> {
    const res = await this.req<RawUsageInfo>(ctx, SUB2API_ENDPOINTS.accountUsage(accountId), {
      query: { source: 'active', force: opts?.force ? 'true' : undefined },
    })
    return normalizeUsageWindows('openai', res.data)
  }

  async resetAccountQuota(ctx: AdapterContext, accountId: number): Promise<NormalizedAccount> {
    const res = await this.req<RawAccount>(ctx, SUB2API_ENDPOINTS.accountResetQuota(accountId), { method: 'POST' })
    return normalizeAccount(ctx.connection.id, res.data)
  }

  async listUsers(ctx: AdapterContext, query: UserListQuery = {}): Promise<{ items: NormalizedUser[]; total: number }> {
    const res = await this.req<Paginated<RawUser>>(ctx, SUB2API_ENDPOINTS.users, {
      query: {
        page: query.page ?? 1,
        page_size: query.pageSize ?? 20,
        search: query.search,
        status: query.status,
      },
    })
    const items = (res.data.items ?? []).map((raw) => normalizeUser(ctx.connection.id, raw))
    return { items, total: res.data.total ?? items.length }
  }

  async getUser(ctx: AdapterContext, userId: number): Promise<NormalizedUser> {
    const res = await this.req<RawUser>(ctx, SUB2API_ENDPOINTS.userById(userId))
    return normalizeUser(ctx.connection.id, res.data)
  }

  async getUserPlatformQuotas(ctx: AdapterContext, userId: number): Promise<QuotaWindow[]> {
    const res = await this.req<{ platform_quotas: RawPlatformQuota[] }>(ctx, SUB2API_ENDPOINTS.userPlatformQuotas(userId))
    return normalizePlatformQuotas(res.data.platform_quotas ?? [])
  }

  async adjustUserBalance(ctx: AdapterContext, input: BalanceAdjustInput): Promise<NormalizedUser> {
    const res = await this.req<RawUser>(ctx, SUB2API_ENDPOINTS.userBalance(input.userId), {
      method: 'POST',
      body: { balance: input.amount, operation: input.operation, notes: input.notes },
    })
    return normalizeUser(ctx.connection.id, res.data)
  }

  async resetUserQuotaWindow(ctx: AdapterContext, input: UserQuotaResetInput): Promise<QuotaWindow[]> {
    const res = await this.req<{ platform_quotas: RawPlatformQuota[] }>(ctx, SUB2API_ENDPOINTS.userPlatformQuotaReset(input.userId), {
      method: 'POST',
      body: { platform: input.platform, window: input.window },
    })
    return normalizePlatformQuotas(res.data.platform_quotas ?? [])
  }

  async getUsersUsage(ctx: AdapterContext, userIds: number[]): Promise<Record<number, number>> {
    const out: Record<number, number> = {}
    if (!userIds.length) return out
    try {
      const res = await this.req<{ stats?: Record<string, { today_actual_cost?: number }> }>(
        ctx,
        SUB2API_ENDPOINTS.dashboardUsersUsage,
        { method: 'POST', body: { user_ids: userIds } },
      )
      for (const [id, row] of Object.entries(res.data.stats ?? {})) {
        out[Number(id)] = row.today_actual_cost ?? 0
      }
    } catch (error) {
      if (!(error instanceof HttpClientError && (error.structured.kind === 'unsupported' || error.structured.kind === 'feature_disabled'))) {
        throw error
      }
    }
    return out
  }

  async getTodaySnapshot(ctx: AdapterContext, range: OverviewRange = 'today'): Promise<TodaySnapshot> {
    const window = overviewRangeQuery(range, ctx.timezone)
    const snap = await this.req<{
      generated_at?: string
      start_date?: string
      stats?: RawDashboardStats
      models?: RawModelStat[]
      trend?: Array<{ date?: string; requests?: number; total_tokens?: number; actual_cost?: number }>
      users_trend?: Array<{ date?: string; user_id?: number; email?: string; username?: string; tokens?: number; requests?: number }>
    }>(ctx, SUB2API_ENDPOINTS.dashboardSnapshotV2, {
      query: {
        include_stats: true,
        include_model_stats: true,
        include_trend: true,
        include_users_trend: true,
        users_trend_limit: 12,
        start_date: window.start_date,
        end_date: window.end_date,
        granularity: window.granularity,
      },
    })

    let errorCount: number | undefined
    let errorRate: number | undefined
    try {
      const ops = await this.req<{ overview?: { error_count_total?: number; error_rate?: number } }>(
        ctx,
        SUB2API_ENDPOINTS.opsSnapshotV2,
        { query: { time_range: window.opsTimeRange } },
      )
      errorCount = ops.data.overview?.error_count_total
      errorRate = ops.data.overview?.error_rate
    } catch (error) {
      if (!(error instanceof HttpClientError && (error.structured.kind === 'feature_disabled' || error.structured.kind === 'unsupported'))) {
        throw error
      }
    }

    const trend = snap.data.trend ?? []
    const models = snap.data.models ?? []
    const useRangeTotals = range !== 'today' && trend.length > 0
    // snapshot-v2 `stats` is always today/lifetime; trend + models follow start/end.
    return normalizeTodaySnapshot({
      connectionId: ctx.connection.id,
      timezone: ctx.timezone,
      stats: snap.data.stats,
      models,
      generatedAt: snap.data.generated_at,
      startDate: snap.data.start_date ?? window.start_date,
      errorCount,
      errorRate,
      requests: useRangeTotals ? trend.reduce((n, p) => n + (p.requests ?? 0), 0) : undefined,
      tokens: useRangeTotals ? trend.reduce((n, p) => n + (p.total_tokens ?? 0), 0) : undefined,
      actualCost: useRangeTotals ? trend.reduce((n, p) => n + (p.actual_cost ?? 0), 0) : undefined,
      accountCost: useRangeTotals ? models.reduce((n, m) => n + (m.account_cost ?? 0), 0) : undefined,
      trend,
      usersTrend: snap.data.users_trend,
    })
  }

  async getTodayModelStats(ctx: AdapterContext): Promise<TodaySnapshot['models']> {
    const res = await this.req<{ models?: RawModelStat[] }>(ctx, SUB2API_ENDPOINTS.dashboardModels)
    return (res.data.models ?? []).map((m) => ({
      model: m.model,
      requests: m.requests,
      tokens: m.total_tokens ?? 0,
      actualCost: m.actual_cost ?? 0,
    }))
  }

  async listErrors(
    ctx: AdapterContext,
    query: ErrorListQuery = {},
  ): Promise<{ items: NormalizedError[]; total: number; unsupported?: boolean }> {
    const kind = query.kind ?? 'all'
    const kinds: Array<'request' | 'upstream'> = kind === 'all' ? ['request', 'upstream'] : [kind]
    const items: NormalizedError[] = []
    let total = 0
    let unsupported = 0
    for (const k of kinds) {
      const path = k === 'request' ? SUB2API_ENDPOINTS.opsRequestErrors : SUB2API_ENDPOINTS.opsUpstreamErrors
      try {
        const res = await this.req<Paginated<RawErrorLog>>(ctx, path, {
          query: {
            page: query.page ?? 1,
            page_size: query.pageSize ?? 50,
            time_range: '24h',
            platform: query.platform,
            model: query.model,
            q: query.search,
            status_codes: query.statusCode,
          },
        })
        items.push(...(res.data.items ?? []).map((raw) => normalizeError(ctx.connection.id, k, raw)))
        total += res.data.total ?? 0
      } catch (error) {
        if (error instanceof HttpClientError && (error.structured.kind === 'feature_disabled' || error.structured.kind === 'unsupported')) {
          unsupported += 1
          continue
        }
        throw error
      }
    }
    return { items, total, unsupported: unsupported === kinds.length }
  }

  async getErrorDetail(ctx: AdapterContext, id: number, kind: 'request' | 'upstream'): Promise<NormalizedError> {
    const path = kind === 'request' ? SUB2API_ENDPOINTS.opsRequestErrorDetail(id) : SUB2API_ENDPOINTS.opsUpstreamErrorDetail(id)
    const res = await this.req<RawErrorLog>(ctx, path)
    return normalizeError(ctx.connection.id, kind, res.data, true)
  }

  getDeepLinks(connection: PlatformConnection): DeepLinks {
    return getSub2ApiDeepLinks(connection)
  }
}

export function mergeAccountUsage(
  accounts: NormalizedAccount[],
  usage: Record<number, { windows: QuotaWindow[]; source?: string; updatedAt?: string | null; raw?: RawUsageInfo }>,
): NormalizedAccount[] {
  return accounts.map((account) => {
    const extra = usage[account.id]
    if (!extra) return account
    const windows = extra.raw
      ? normalizeUsageWindows(account.upstreamPlatform, extra.raw)
      : extra.windows
    return {
      ...account,
      quotaWindows: windows,
      updatedAt: extra.updatedAt ?? account.updatedAt,
      usageSource: (extra.source as NormalizedAccount['usageSource']) ?? account.usageSource,
    }
  })
}
