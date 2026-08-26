import type {
  AggregatedOverview,
  AuditEntry,
  NormalizedAccount,
  NormalizedError,
  NormalizedUser,
  PlatformConnection,
  QuotaAggregate,
  QuotaWindow,
  TodaySnapshot,
  VaultUiStatus,
} from '@/domain/models'
import type { DeepLinks } from '@/core/adapters/types'

export const ALL_SCOPE = '__all__'

export type RpcMethod =
  | 'connections.list'
  | 'connections.add'
  | 'connections.update'
  | 'connections.remove'
  | 'connections.test'
  | 'secrets.status'
  | 'secrets.lock'
  | 'secrets.unlock'
  | 'secrets.setupPassword'
  | 'secrets.setPassword'
  | 'secrets.clearPassword'
  | 'secrets.put'
  | 'overview.get'
  | 'accounts.list'
  | 'accounts.refreshQuota'
  | 'users.list'
  | 'users.get'
  | 'users.platformQuotas'
  | 'users.adjustBalance'
  | 'users.resetQuota'
  | 'accounts.resetQuota'
  | 'errors.list'
  | 'errors.detail'
  | 'links.get'
  | 'audit.list'
  | 'theme.get'

export interface RpcRequest<T = unknown> {
  id: string
  method: RpcMethod
  payload?: T
}

export interface RpcOk<T> {
  id: string
  ok: true
  data: T
}

export interface RpcErr {
  id: string
  ok: false
  error: { kind: string; message: string; code?: string | number }
}

export type RpcResponse<T = unknown> = RpcOk<T> | RpcErr

export interface AddConnectionPayload {
  name: string
  baseUrl: string
  authMode: PlatformConnection['authMode']
  secret: string
  readOnly?: boolean
  persistSecrets?: boolean
  lockSecrets?: boolean
  vaultPassword?: string
}

export interface OverviewResult {
  aggregated: AggregatedOverview
  quota: QuotaAggregate
  accounts: NormalizedAccount[]
}

export interface AccountsResult {
  items: NormalizedAccount[]
  total: number
  failures: Array<{ connectionId: string; message: string }>
}

export interface UsersResult {
  items: NormalizedUser[]
  total: number
}

export interface ErrorsResult {
  items: NormalizedError[]
  total: number
  unsupported?: boolean
  failures?: Array<{ connectionId: string; message: string }>
}

export interface SecretStatusResult {
  status: VaultUiStatus
  persistEnabled: boolean
  encrypted: boolean
}

export type RpcResults = {
  'connections.list': PlatformConnection[]
  'connections.add': PlatformConnection
  'connections.update': PlatformConnection
  'connections.remove': { id: string }
  'connections.test': PlatformConnection
  'secrets.status': SecretStatusResult
  'secrets.lock': { ok: true }
  'secrets.unlock': { ok: boolean }
  'secrets.setupPassword': { ok: true }
  'secrets.setPassword': { ok: true }
  'secrets.clearPassword': { ok: true }
  'secrets.put': { status: 'available' }
  'overview.get': OverviewResult
  'accounts.list': AccountsResult
  'accounts.refreshQuota': { windows: QuotaWindow[] }
  'users.list': UsersResult
  'users.get': NormalizedUser
  'users.platformQuotas': QuotaWindow[]
  'users.adjustBalance': { before: NormalizedUser; after: NormalizedUser }
  'users.resetQuota': { before: QuotaWindow[]; after: QuotaWindow[] }
  'accounts.resetQuota': { before: NormalizedAccount; after: NormalizedAccount }
  'errors.list': ErrorsResult
  'errors.detail': NormalizedError
  'links.get': DeepLinks
  'audit.list': AuditEntry[]
  'theme.get': { preset: string }
}

export type TodaySnapshotView = TodaySnapshot
