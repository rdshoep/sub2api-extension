import type { CapabilityState } from '@/domain/models'
import { CAPABILITY_IDS } from '@/domain/models'
export { capabilityFallback } from '@/core/capabilities/state'
import { HttpClientError, type TypedHttpClient } from '@/core/http/client'
import type { AdapterContext, ProbeResult } from '@/core/adapters/types'
import { SUB2API_ENDPOINTS } from './endpoints'

async function probePath(
  http: TypedHttpClient,
  ctx: AdapterContext,
  path: string,
): Promise<CapabilityState> {
  try {
    await http.request({
      apiBase: ctx.connection.apiBase,
      path,
      method: 'GET',
      query: path.includes('/admin/accounts') || path.includes('/admin/users') ? { page: 1, page_size: 1 } : undefined,
      auth: ctx.auth,
      timezone: ctx.timezone,
      acceptLanguage: ctx.acceptLanguage,
      signal: ctx.signal,
      timeoutMs: 8_000,
    })
    return 'supported'
  } catch (error) {
    if (error instanceof HttpClientError) {
      if (error.structured.kind === 'unauthorized') throw error
      if (error.structured.kind === 'feature_disabled' || error.structured.kind === 'unsupported') return 'unsupported'
      if (error.structured.kind === 'forbidden') return 'unsupported'
      return 'degraded'
    }
    return 'degraded'
  }
}

export async function probeSub2Api(http: TypedHttpClient, ctx: AdapterContext): Promise<ProbeResult> {
  const capabilities: Record<string, CapabilityState> = Object.fromEntries(CAPABILITY_IDS.map((id) => [id, 'unsupported']))
  capabilities['links.open'] = 'supported'

  let version: string | undefined
  let status: ProbeResult['status'] = 'online'

  try {
    const ver = await http.request<{ version?: string }>({
      apiBase: ctx.connection.apiBase,
      path: SUB2API_ENDPOINTS.version,
      auth: ctx.auth,
      timezone: ctx.timezone,
      acceptLanguage: ctx.acceptLanguage,
      signal: ctx.signal,
      timeoutMs: 8_000,
    })
    version = ver.data.version
    capabilities['platform.probe'] = 'supported'
  } catch (error) {
    if (error instanceof HttpClientError && error.structured.kind === 'unauthorized') {
      return { version, status: 'unauthorized', capabilities }
    }
    capabilities['platform.probe'] = 'degraded'
    status = 'degraded'
  }

  const checks: Array<[string, string]> = [
    ['accounts.list', SUB2API_ENDPOINTS.accounts],
    ['users.list', SUB2API_ENDPOINTS.users],
    ['stats.today.read', SUB2API_ENDPOINTS.dashboardSnapshotV2],
    ['stats.models.read', SUB2API_ENDPOINTS.dashboardModels],
    ['errors.read', SUB2API_ENDPOINTS.opsRequestErrors],
  ]

  const results = await Promise.all(
    checks.map(async ([id, path]) => [id, await probePath(http, ctx, path)] as const),
  )
  for (const [id, state] of results) capabilities[id] = state

  capabilities['accounts.quota.read'] = capabilities['accounts.list']
  capabilities['accounts.quota.refresh'] = capabilities['accounts.list']
  capabilities['accounts.quota.reset'] = capabilities['accounts.list'] === 'supported' ? 'supported' : 'unsupported'
  capabilities['users.balance.read'] = capabilities['users.list']
  capabilities['users.balance.write'] = capabilities['users.list'] === 'supported' ? 'supported' : 'unsupported'
  capabilities['users.quota.read'] = capabilities['users.list']
  capabilities['users.quota.reset'] = capabilities['users.list'] === 'supported' ? 'supported' : 'unsupported'
  capabilities['errors.detail.read'] = capabilities['errors.read']

  if (Object.values(capabilities).every((s) => s === 'unsupported' || s === 'degraded') && capabilities['platform.probe'] !== 'supported') {
    status = 'offline'
  } else if (Object.values(capabilities).some((s) => s === 'degraded' || s === 'unsupported')) {
    if (status === 'online') status = capabilities['platform.probe'] === 'supported' ? 'online' : 'degraded'
  }

  return { version, status, capabilities }
}
