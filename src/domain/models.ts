export const ALL_INSTANCES_ID = '__all__'

export type AuthMode = 'admin-api-key' | 'jwt'
export type ConnectionStatus = 'online' | 'offline' | 'unauthorized' | 'degraded'
export type CapabilityState = 'supported' | 'degraded' | 'unsupported'
export type QuotaState =
  | 'healthy'
  | 'warning'
  | 'critical'
  | 'exhausted'
  | 'unlimited'
  | 'unknown'
  | 'stale'
  | 'over-limit'
export type QuotaSource = 'passive' | 'active' | 'local' | 'upstream'
export type VaultUiStatus = 'available' | 'locked' | 'missing'

export interface PlatformConnection {
  id: string
  name: string
  baseUrl: string
  origin: string
  apiBase: string
  authRef: string
  authMode: AuthMode
  readOnly: boolean
  persistSecrets: boolean
  lockSecrets?: boolean
  alertsEnabled: boolean
  version?: string
  status: ConnectionStatus
  capabilities: Record<string, CapabilityState>
  lastCheckedAt?: string
  createdAt: string
}

export interface QuotaWindow {
  id: string
  label: string
  usedPercent?: number
  remainingPercent?: number
  used?: number
  limit?: number | null
  unit?: 'percent' | 'usd' | 'requests' | 'tokens' | 'credits'
  resetAt?: string | null
  remainingSeconds?: number | null
  source?: QuotaSource
  updatedAt?: string | null
  state: QuotaState
  overLimit?: boolean
}

export interface NormalizedAccount {
  uid: string
  connectionId: string
  id: number
  name: string
  upstreamPlatform: string
  status: string
  schedulable?: boolean
  group?: string
  quotaWindows: QuotaWindow[]
  updatedAt?: string | null
  usageSource?: QuotaSource
  raw?: unknown
}

export interface NormalizedUser {
  uid: string
  connectionId: string
  id: number
  email: string
  username: string
  balance: number
  status: string
  todayActualCost?: number
  lastActiveAt?: string | null
  platformQuotas?: QuotaWindow[]
  raw?: unknown
}

export interface ModelStatRow {
  model: string
  requests: number
  tokens: number
  actualCost: number
}

export interface TrendPoint {
  at: string
  tokens: number
  requests: number
}

export interface UserTrendSeries {
  uid: string
  label: string
  points: TrendPoint[]
}

export interface TodaySnapshot {
  connectionId: string
  date: string
  timezone: string
  requests: number
  tokens: number
  actualCost: number
  accountCost?: number
  errorCount?: number
  errorRate?: number
  rpm?: number
  tpm?: number
  normalAccounts?: number
  rateLimitedAccounts?: number
  errorAccounts?: number
  models: ModelStatRow[]
  trend: TrendPoint[]
  userSeries: UserTrendSeries[]
  fetchedAt: string
  staleAt?: string
}

export interface NormalizedError {
  uid: string
  connectionId: string
  id: number
  kind: 'request' | 'upstream'
  createdAt: string
  statusCode?: number
  platform?: string
  model?: string
  accountName?: string
  userEmail?: string
  message: string
  summary: string
  detail?: string
}

export interface PartialFailure {
  connectionId: string
  connectionName?: string
  message: string
  code?: string | number
}

export interface AggregatedOverview {
  timezone: string
  date: string
  requests: number
  tokens: number
  actualCost: number
  accountCost: number
  errorCount: number
  errorRate: number
  rpm: number
  tpm: number
  normalAccounts: number
  rateLimitedAccounts: number
  errorAccounts: number
  models: ModelStatRow[]
  trend: TrendPoint[]
  userSeries: UserTrendSeries[]
  snapshots: TodaySnapshot[]
  failures: PartialFailure[]
}

export interface QuotaAggregate {
  criticalCount: number
  lowestRemaining: number | null
  nearestResetAt: string | null
}

export interface WriteConfirmation {
  action: string
  connectionId: string
  connectionName: string
  targetType: 'user' | 'account'
  targetId: string | number
  targetLabel: string
  reason: string
  before: unknown
  afterExpected?: unknown
}

export interface AuditEntry {
  id: string
  at: string
  connectionId: string
  action: string
  target: string
  reason: string
  before: unknown
  after: unknown
  result: 'success' | 'failure' | 'unsupported'
  message?: string
}

export interface CacheEntry<T> {
  data: T
  fetchedAt: string
  source: QuotaSource | 'mixed'
  staleAt: string
}

export const CAPABILITY_IDS = [
  'platform.probe',
  'accounts.list',
  'accounts.quota.read',
  'accounts.quota.refresh',
  'accounts.quota.reset',
  'users.list',
  'users.balance.read',
  'users.balance.write',
  'users.quota.read',
  'users.quota.reset',
  'stats.today.read',
  'stats.models.read',
  'errors.read',
  'errors.detail.read',
  'links.open',
] as const

export type CapabilityId = (typeof CAPABILITY_IDS)[number]

export function compositeUid(connectionId: string, entityId: string | number): string {
  return `${connectionId}:${entityId}`
}
