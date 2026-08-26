/** Paths relative to `/api/v1`. Mapped from Wei-Shaw/sub2api admin frontend. */
export const SUB2API_ENDPOINTS = {
  version: '/admin/system/version',
  accounts: '/admin/accounts',
  accountUsage: (id: number) => `/admin/accounts/${id}/usage`,
  accountUsageBatch: '/admin/accounts/usage/batch',
  accountResetQuota: (id: number) => `/admin/accounts/${id}/reset-quota`,
  accountById: (id: number) => `/admin/accounts/${id}`,
  users: '/admin/users',
  userById: (id: number) => `/admin/users/${id}`,
  userBalance: (id: number) => `/admin/users/${id}/balance`,
  userPlatformQuotas: (id: number) => `/admin/users/${id}/platform-quotas`,
  userPlatformQuotaReset: (id: number) => `/admin/users/${id}/platform-quotas/reset`,
  dashboardSnapshotV2: '/admin/dashboard/snapshot-v2',
  dashboardModels: '/admin/dashboard/models',
  dashboardUsersUsage: '/admin/dashboard/users-usage',
  opsSnapshotV2: '/admin/ops/dashboard/snapshot-v2',
  opsRequestErrors: '/admin/ops/request-errors',
  opsUpstreamErrors: '/admin/ops/upstream-errors',
  opsRequestErrorDetail: (id: number) => `/admin/ops/request-errors/${id}`,
  opsUpstreamErrorDetail: (id: number) => `/admin/ops/upstream-errors/${id}`,
  opsRequests: '/admin/ops/requests',
} as const

export const BATCH_USAGE_CHUNK = 50
