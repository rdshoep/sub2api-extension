import type {
  CapabilityState,
  NormalizedAccount,
  NormalizedError,
  NormalizedUser,
  PlatformConnection,
  QuotaWindow,
  TodaySnapshot,
} from '@/domain/models'
import type { AuthSecret } from '@/core/http/client'
import type { OverviewRange } from '@/domain/range'

export interface AdapterContext {
  connection: PlatformConnection
  auth: AuthSecret
  timezone: string
  acceptLanguage?: string
  signal?: AbortSignal
}

export interface AccountListQuery {
  page?: number
  pageSize?: number
  platform?: string
  status?: string
  group?: string
  search?: string
}

export interface UserListQuery {
  page?: number
  pageSize?: number
  search?: string
  status?: string
}

export interface ErrorListQuery {
  kind?: 'request' | 'upstream' | 'all'
  page?: number
  pageSize?: number
  platform?: string
  statusCode?: number
  model?: string
  search?: string
}

export interface DeepLinks {
  dashboard: string
  accounts: string
  users: string
  ops: string
  usage: string
}

export interface ProbeResult {
  version?: string
  status: PlatformConnection['status']
  capabilities: Record<string, CapabilityState>
}

export interface BalanceAdjustInput {
  userId: number
  operation: 'set' | 'add' | 'subtract'
  amount: number
  notes: string
}

export interface UserQuotaResetInput {
  userId: number
  platform: string
  window: 'daily' | 'weekly' | 'monthly'
}

export interface PlatformAdapter {
  readonly id: string
  readonly version: number
  probeConnection(ctx: AdapterContext): Promise<ProbeResult>
  listAccounts(ctx: AdapterContext, query?: AccountListQuery): Promise<{ items: NormalizedAccount[]; total: number }>
  getAccountQuotaBatch(
    ctx: AdapterContext,
    accountIds: number[],
    opts?: { force?: boolean },
  ): Promise<Record<number, { windows: QuotaWindow[]; source?: string; updatedAt?: string | null }>>
  refreshAccountQuota(ctx: AdapterContext, accountId: number, opts?: { force?: boolean }): Promise<QuotaWindow[]>
  resetAccountQuota(ctx: AdapterContext, accountId: number): Promise<NormalizedAccount>
  listUsers(ctx: AdapterContext, query?: UserListQuery): Promise<{ items: NormalizedUser[]; total: number }>
  getUser(ctx: AdapterContext, userId: number): Promise<NormalizedUser>
  getUserPlatformQuotas(ctx: AdapterContext, userId: number): Promise<QuotaWindow[]>
  adjustUserBalance(ctx: AdapterContext, input: BalanceAdjustInput): Promise<NormalizedUser>
  resetUserQuotaWindow(ctx: AdapterContext, input: UserQuotaResetInput): Promise<QuotaWindow[]>
  getUsersUsage(ctx: AdapterContext, userIds: number[]): Promise<Record<number, number>>
  getTodaySnapshot(ctx: AdapterContext, range?: OverviewRange): Promise<TodaySnapshot>
  getTodayModelStats(ctx: AdapterContext): Promise<TodaySnapshot['models']>
  listErrors(ctx: AdapterContext, query?: ErrorListQuery): Promise<{ items: NormalizedError[]; total: number; unsupported?: boolean }>
  getErrorDetail(ctx: AdapterContext, id: number, kind: 'request' | 'upstream'): Promise<NormalizedError>
  getDeepLinks(connection: PlatformConnection): DeepLinks
}
