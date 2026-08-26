import type { ConsoleKernel } from '@/core/kernel'
import type { RpcMethod, RpcRequest, RpcResponse } from './protocol'
import { HttpClientError } from '@/core/http/client'
import { redactSecrets } from '@/core/security/redact'

function fail(id: string, error: unknown): RpcResponse {
  if (error instanceof HttpClientError) {
    return { id, ok: false, error: { kind: error.structured.kind, message: redactSecrets(error.structured.message), code: error.structured.code } }
  }
  const err = error as { message?: string; code?: string | number }
  const kind = String(err.code || 'error')
  return { id, ok: false, error: { kind, message: redactSecrets(err.message || 'Request failed'), code: err.code } }
}

export async function handleRpc(kernel: ConsoleKernel, request: RpcRequest): Promise<RpcResponse> {
  const { id, method, payload } = request
  const p = (payload ?? {}) as Record<string, any>
  try {
    const data = await dispatch(kernel, method, p)
    return { id, ok: true, data }
  } catch (error) {
    return fail(id, error)
  }
}

async function dispatch(kernel: ConsoleKernel, method: RpcMethod, p: Record<string, any>): Promise<unknown> {
  switch (method) {
    case 'connections.list':
      return kernel.connections.list()
    case 'connections.add':
      return kernel.addConnection(p as any)
    case 'connections.update':
      return kernel.connections.update(p.id, p.patch)
    case 'connections.remove': {
      const conn = await kernel.connections.get(p.id)
      if (conn) await kernel.vault.remove(conn.authRef)
      await kernel.connections.remove(p.id)
      return { id: p.id }
    }
    case 'connections.test':
      return kernel.testConnection(p.id)
    case 'secrets.status': {
      const conn = await kernel.connections.get(p.connectionId)
      if (!conn) return { status: 'missing', persistEnabled: false, encrypted: false }
      return kernel.vault.getUiStatus(conn.authRef)
    }
    case 'secrets.lock':
      await kernel.vault.lock()
      return { ok: true }
    case 'secrets.unlock':
      return { ok: await kernel.vault.unlock(p.password) }
    case 'secrets.setupPassword':
      await kernel.vault.setupPersistPassword(p.password)
      return { ok: true }
    case 'secrets.setPassword':
      await kernel.setConnectionPassword(p.connectionId, p.password)
      return { ok: true }
    case 'secrets.clearPassword':
      await kernel.clearConnectionPassword(p.connectionId, p.password)
      return { ok: true }
    case 'secrets.put':
      return kernel.putSecret(p.connectionId, p.secret)
    case 'overview.get':
      return kernel.getOverview(p.connectionId, p.range, p.cacheOnly)
    case 'accounts.list':
      return kernel.listAccounts(p.connectionId, p, p.cacheOnly)
    case 'accounts.refreshQuota':
      await kernel.persist.invalidate('accounts:')
      return { windows: await kernel.refreshAccountQuota(p.connectionId, p.accountId, p.force) }
    case 'users.list':
      return kernel.listUsers(p.connectionId, p.search, p.cacheOnly)
    case 'users.get':
      return kernel.getUser(p.connectionId, p.userId)
    case 'users.platformQuotas':
      return kernel.getUserPlatformQuotas(p.connectionId, p.userId)
    case 'users.adjustBalance':
      return kernel.adjustUserBalance(p as any)
    case 'users.resetQuota':
      return kernel.resetUserQuota(p as any)
    case 'accounts.resetQuota':
      return kernel.resetAccountQuota(p as any)
    case 'errors.list':
      return kernel.listErrors(p.connectionId, p.cacheOnly)
    case 'errors.detail':
      return kernel.getErrorDetail(p.connectionId, p.errorId, p.kind)
    case 'links.get':
      return kernel.getLinks(p.connectionId)
    case 'audit.list':
      return kernel.audit.list()
    case 'theme.get':
      return { preset: 'sub2api' }
    default:
      throw Object.assign(new Error(`Unknown method ${(method as string) || ''}`), { code: 'UNKNOWN_METHOD' })
  }
}
