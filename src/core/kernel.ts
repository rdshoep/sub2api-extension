import { ConnectionRegistry, type AddConnectionInput } from '@/core/connections/registry'
import { TypedHttpClient, type AuthSecret } from '@/core/http/client'
import { HttpClientError } from '@/core/http/client'
import { normalizeBaseUrl } from '@/core/http/base-url'
import { AuditLog } from '@/core/security/audit'
import { requestExactOrigin, type PermissionsApi } from '@/core/security/permissions'
import { SecretVault } from '@/core/security/secret-vault'
import { assertWritesAllowed, buildConfirmation, withDoubleSubmitGuard } from '@/core/security/write-guard'
import type { KeyValueStorage } from '@/core/security/storage'
import { QueryCache } from '@/core/query-cache/cache'
import { PersistentCache } from '@/core/query-cache/persistent'
import { Sub2ApiAdapter, mergeAccountUsage } from '@/providers/sub2api/adapter'
import { aggregateQuotaWindows, aggregateTodaySnapshots, allSettledMap } from '@/domain/aggregate'
import { ALL_INSTANCES_ID, type NormalizedUser, type PlatformConnection, type QuotaWindow } from '@/domain/models'
import type { AddConnectionPayload, OverviewResult } from './messaging/protocol'
import type { OverviewRange } from '@/domain/range'

export interface KernelDeps {
  local: KeyValueStorage
  session: KeyValueStorage
  permissions: PermissionsApi
  http?: TypedHttpClient
  openTab?: (url: string) => void
}

export class ConsoleKernel {
  readonly connections: ConnectionRegistry
  readonly vault: SecretVault
  readonly audit: AuditLog
  readonly cache = new QueryCache()
  readonly persist: PersistentCache
  readonly adapter: Sub2ApiAdapter
  readonly permissions: PermissionsApi
  readonly http: TypedHttpClient

  constructor(deps: KernelDeps) {
    this.connections = new ConnectionRegistry(deps.local)
    this.vault = new SecretVault({ session: deps.session, local: deps.local })
    this.audit = new AuditLog(deps.local)
    this.persist = new PersistentCache(deps.local)
    this.http = deps.http ?? new TypedHttpClient()
    this.adapter = new Sub2ApiAdapter(this.http)
    this.permissions = deps.permissions
  }

  private timezone(): string {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    } catch {
      return 'UTC'
    }
  }

  private todayDate(timeZone: string): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
      new Date(),
    )
  }

  private async authFor(connection: PlatformConnection): Promise<AuthSecret> {
    const secret = await this.vault.revealForRequest(connection.authRef)
    if (!secret) {
      throw Object.assign(new Error('Credentials are locked or missing'), { code: 'VAULT_LOCKED' })
    }
    return { mode: connection.authMode, secret }
  }

  private async ctx(connection: PlatformConnection) {
    return {
      connection,
      auth: await this.authFor(connection),
      timezone: this.timezone(),
      acceptLanguage: 'zh-CN',
    }
  }

  private async scoped(connectionId?: string): Promise<PlatformConnection[]> {
    const all = await this.connections.list()
    if (!connectionId || connectionId === ALL_INSTANCES_ID) return all
    return all.filter((c) => c.id === connectionId)
  }

  async addConnection(payload: AddConnectionPayload): Promise<PlatformConnection> {
    const urls = normalizeBaseUrl(payload.baseUrl)
    await requestExactOrigin(this.permissions, urls.hostPermissionOrigin)
    const lockSecrets = Boolean(payload.lockSecrets)
    const persistSecrets = lockSecrets || payload.persistSecrets !== false
    if (lockSecrets) await this.ensureVaultPassword(payload.vaultPassword)
    const input: AddConnectionInput = {
      name: payload.name,
      baseUrl: payload.baseUrl,
      authMode: payload.authMode,
      readOnly: payload.readOnly,
      persistSecrets,
      lockSecrets,
    }
    const connection = await this.connections.add(input)
    await this.vault.put(connection.authRef, payload.secret, persistSecrets, lockSecrets)
    return this.testConnection(connection.id)
  }

  async testConnection(id: string): Promise<PlatformConnection> {
    const connection = await this.connections.get(id)
    if (!connection) throw new Error('Connection not found')
    try {
      const probe = await this.adapter.probeConnection(await this.ctx(connection))
      return this.connections.update(id, {
        version: probe.version,
        status: probe.status,
        capabilities: probe.capabilities,
        lastCheckedAt: new Date().toISOString(),
      })
    } catch (error) {
      const kind = error instanceof HttpClientError ? error.structured.kind : 'network'
      const status = kind === 'unauthorized' ? 'unauthorized' : 'offline'
      return this.connections.update(id, { status, lastCheckedAt: new Date().toISOString() })
    }
  }

  private async cached<T>(key: string, cacheOnly: boolean | undefined, loader: () => Promise<T>): Promise<T> {
    const hit = await this.persist.get<T>(key)
    if (cacheOnly) {
      if (hit !== undefined) return hit
      throw Object.assign(new Error('NO_CACHE'), { code: 'NO_CACHE' })
    }
    try {
      const fresh = await loader()
      await this.persist.set(key, fresh)
      return fresh
    } catch (error) {
      if (hit !== undefined) return hit
      throw error
    }
  }

  async getOverview(connectionId?: string, range: OverviewRange = 'today', cacheOnly = false): Promise<OverviewResult> {
    const targets = await this.scoped(connectionId)
    const tz = this.timezone()
    const date = this.todayDate(tz)
    const key = `overview:${targets.map((t) => t.id).join(',')}:${range}:${date}`
    return this.cached(key, cacheOnly, async () => {
    const results = await allSettledMap(targets, async (id) => {
      const connection = targets.find((c) => c.id === id)!
      return this.adapter.getTodaySnapshot(await this.ctx(connection), range)
    })
    const accountPack = await allSettledMap(targets, async (id) => {
      const connection = targets.find((c) => c.id === id)!
      const ctx = await this.ctx(connection)
      const listed = await this.adapter.listAccounts(ctx, { pageSize: 50 })
      const usage = await this.adapter.getAccountQuotaBatch(
        ctx,
        listed.items.map((a) => a.id),
      )
      return mergeAccountUsage(listed.items, usage)
    })
    const accounts = accountPack.flatMap((r) => (r.ok && r.data ? r.data : []))
    const aggregated = aggregateTodaySnapshots(
      results.map((r) => ({
        connectionId: r.connectionId,
        connectionName: r.connectionName,
        ok: r.ok,
        data: r.data,
        error: r.error,
      })),
      tz,
      date,
    )
    for (const fail of accountPack.filter((r) => !r.ok)) {
      if (!aggregated.failures.some((f) => f.connectionId === fail.connectionId)) {
        aggregated.failures.push({
          connectionId: fail.connectionId,
          connectionName: fail.connectionName,
          message: fail.error?.message || 'Account fetch failed',
        })
      }
    }
    return { aggregated, quota: aggregateQuotaWindows(accounts), accounts }
    })
  }

  async listAccounts(connectionId?: string, filters?: { platform?: string; status?: string; search?: string; group?: string }, cacheOnly = false) {
    const key = `accounts:${connectionId || 'all'}`
    return this.cached(key, cacheOnly, async () => {
    const targets = await this.scoped(connectionId)
    const pack = await allSettledMap(targets, async (id) => {
      const connection = targets.find((c) => c.id === id)!
      const ctx = await this.ctx(connection)
      const listed = await this.adapter.listAccounts(ctx, { ...filters, pageSize: 50 })
      const usage = await this.adapter.getAccountQuotaBatch(
        ctx,
        listed.items.map((a) => a.id),
      )
      return { items: mergeAccountUsage(listed.items, usage), total: listed.total }
    })
    const items = pack.flatMap((r) => (r.ok && r.data ? r.data.items : []))
    const failures = pack
      .filter((r) => !r.ok)
      .map((r) => ({ connectionId: r.connectionId, message: r.error?.message || 'Failed' }))
    return { items, total: items.length, failures }
    })
  }

  async refreshAccountQuota(connectionId: string, accountId: number, force = false): Promise<QuotaWindow[]> {
    const connection = await this.requireConnection(connectionId)
    const ctx = await this.ctx(connection)
    return this.adapter.refreshAccountQuota(ctx, accountId, { force })
  }

  async listUsers(connectionId?: string, search?: string, cacheOnly = false) {
    const key = `users:${connectionId || 'all'}:${search || ''}`
    return this.cached(key, cacheOnly, async () => {
    const targets = await this.scoped(connectionId)
    const pack = await allSettledMap(targets, async (id) => {
      const connection = targets.find((c) => c.id === id)!
      const ctx = await this.ctx(connection)
      const listed = await this.adapter.listUsers(ctx, { search, pageSize: 100 })
      const usage = await this.adapter.getUsersUsage(
        ctx,
        listed.items.map((u) => u.id),
      )
      return listed.items.map((user) => ({
        ...user,
        todayActualCost: usage[user.id] ?? user.todayActualCost,
      }))
    })
    const items = pack.flatMap((r) => (r.ok && r.data ? r.data : []))
    return { items, total: items.length }
    })
  }

  async getUser(connectionId: string, userId: number): Promise<NormalizedUser> {
    const connection = await this.requireConnection(connectionId)
    return this.adapter.getUser(await this.ctx(connection), userId)
  }

  async getUserPlatformQuotas(connectionId: string, userId: number): Promise<QuotaWindow[]> {
    const connection = await this.requireConnection(connectionId)
    return this.adapter.getUserPlatformQuotas(await this.ctx(connection), userId)
  }

  async adjustUserBalance(input: {
    connectionId: string
    userId: number
    operation: 'set' | 'add' | 'subtract'
    amount: number
    reason: string
  }) {
    const connection = await this.requireConnection(input.connectionId)
    assertWritesAllowed(connection, 'users.balance.write')
    const ctx = await this.ctx(connection)
    const before = await this.adapter.getUser(ctx, input.userId)
    buildConfirmation({
      action: 'user.balance.adjust',
      connectionId: connection.id,
      connectionName: connection.name,
      targetType: 'user',
      targetId: input.userId,
      targetLabel: before.email || before.username,
      reason: input.reason,
      before,
    })
    return withDoubleSubmitGuard(`balance:${connection.id}:${input.userId}`, async () => {
      try {
        const written = await this.adapter.adjustUserBalance(ctx, {
          userId: input.userId,
          operation: input.operation,
          amount: input.amount,
          notes: input.reason,
        })
        const after = await this.adapter.getUser(ctx, input.userId)
        await this.audit.append({
          connectionId: connection.id,
          action: 'user.balance.adjust',
          target: `${before.email} (${input.userId})`,
          reason: input.reason,
          before: { balance: before.balance },
          after: { balance: after.balance, written: written.balance },
          result: 'success',
        })
        await this.persist.invalidate('users:')
        return { before, after }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Write failed'
        const unsupported = (error as { code?: string }).code === 'UNSUPPORTED' || message.toLowerCase().includes('not found')
        await this.audit.append({
          connectionId: connection.id,
          action: 'user.balance.adjust',
          target: `${before.email} (${input.userId})`,
          reason: input.reason,
          before: { balance: before.balance },
          after: { balance: before.balance },
          result: unsupported ? 'unsupported' : 'failure',
          message,
        })
        throw error
      }
    })
  }

  async resetUserQuota(input: {
    connectionId: string
    userId: number
    platform: string
    window: 'daily' | 'weekly' | 'monthly'
    reason: string
  }) {
    const connection = await this.requireConnection(input.connectionId)
    assertWritesAllowed(connection, 'users.quota.reset')
    const ctx = await this.ctx(connection)
    const before = await this.adapter.getUserPlatformQuotas(ctx, input.userId)
    const user = await this.adapter.getUser(ctx, input.userId)
    buildConfirmation({
      action: 'user.quota.reset',
      connectionId: connection.id,
      connectionName: connection.name,
      targetType: 'user',
      targetId: input.userId,
      targetLabel: `${user.email} / ${input.platform} / ${input.window}`,
      reason: input.reason,
      before,
    })
    return withDoubleSubmitGuard(`uq:${connection.id}:${input.userId}:${input.platform}:${input.window}`, async () => {
      const after = await this.adapter.resetUserQuotaWindow(ctx, {
        userId: input.userId,
        platform: input.platform,
        window: input.window,
      })
      const verified = await this.adapter.getUserPlatformQuotas(ctx, input.userId)
      await this.audit.append({
        connectionId: connection.id,
        action: 'user.quota.reset',
        target: `${user.email} ${input.platform} ${input.window}`,
        reason: input.reason,
        before,
        after: verified,
        result: 'success',
      })
      await this.persist.invalidate('users:')
      return { before, after: verified.length ? verified : after }
    })
  }

  async resetAccountQuota(input: { connectionId: string; accountId: number; reason: string }) {
    const connection = await this.requireConnection(input.connectionId)
    assertWritesAllowed(connection, 'accounts.quota.reset')
    const ctx = await this.ctx(connection)
    const listed = await this.adapter.listAccounts(ctx, { pageSize: 100 })
    const before = listed.items.find((a) => a.id === input.accountId)
    if (!before) throw new Error('Account not found')
    const usageBefore = await this.adapter.getAccountQuotaBatch(ctx, [input.accountId])
    const beforeWithUsage = mergeAccountUsage([before], usageBefore)[0]
    buildConfirmation({
      action: 'accounts.quota.reset',
      connectionId: connection.id,
      connectionName: connection.name,
      targetType: 'account',
      targetId: input.accountId,
      targetLabel: `${beforeWithUsage.name} (#${beforeWithUsage.id})`,
      reason: input.reason,
      before: beforeWithUsage,
    })
    return withDoubleSubmitGuard(`aq:${connection.id}:${input.accountId}`, async () => {
      const written = await this.adapter.resetAccountQuota(ctx, input.accountId)
      const usageAfter = await this.adapter.getAccountQuotaBatch(ctx, [input.accountId])
      const after = mergeAccountUsage([written], usageAfter)[0]
      await this.audit.append({
        connectionId: connection.id,
        action: 'accounts.quota.reset',
        target: `${beforeWithUsage.name} (#${beforeWithUsage.id})`,
        reason: input.reason,
        before: { name: beforeWithUsage.name, id: beforeWithUsage.id, windows: beforeWithUsage.quotaWindows },
        after: { name: after.name, id: after.id, windows: after.quotaWindows },
        result: 'success',
      })
      await this.persist.invalidate('accounts:')
      return { before: beforeWithUsage, after }
    })
  }

  async listErrors(connectionId?: string, cacheOnly = false) {
    const key = `errors:${connectionId || 'all'}`
    return this.cached(key, cacheOnly, async () => {
    const targets = await this.scoped(connectionId)
    const pack = await allSettledMap(targets, async (id) => {
      const connection = targets.find((c) => c.id === id)!
      return this.adapter.listErrors(await this.ctx(connection), { pageSize: 20 })
    })
    const items = pack.flatMap((r) => (r.ok && r.data ? r.data.items : []))
    const failures = pack
      .filter((r) => !r.ok)
      .map((r) => ({ connectionId: r.connectionId, message: r.error?.message || 'Failed' }))
    const ok = pack.filter((r) => r.ok)
    const unsupported = ok.length > 0 && failures.length === 0 && ok.every((r) => r.data?.unsupported)
    return { items, total: items.length, unsupported, failures }
    })
  }

  async getErrorDetail(connectionId: string, id: number, kind: 'request' | 'upstream') {
    const connection = await this.requireConnection(connectionId)
    return this.adapter.getErrorDetail(await this.ctx(connection), id, kind)
  }

  async getLinks(connectionId: string) {
    const connection = await this.requireConnection(connectionId)
    return this.adapter.getDeepLinks(connection)
  }

  async putSecret(connectionId: string, secret: string): Promise<{ status: 'available' }> {
    const connection = await this.requireConnection(connectionId)
    const ui = await this.vault.getUiStatus(connection.authRef)
    const lockSecrets = Boolean(connection.lockSecrets) || ui.encrypted
    await this.vault.put(connection.authRef, secret, connection.persistSecrets || lockSecrets, lockSecrets)
    return { status: 'available' }
  }

  async setConnectionPassword(connectionId: string, password: string): Promise<PlatformConnection> {
    const connection = await this.requireConnection(connectionId)
    const secret = await this.vault.revealForRequest(connection.authRef)
    if (!secret) {
      throw Object.assign(new Error('Credentials are locked or missing'), { code: 'VAULT_LOCKED' })
    }
    await this.ensureVaultPassword(password)
    await this.vault.put(connection.authRef, secret, true, true)
    return this.connections.update(connectionId, { persistSecrets: true, lockSecrets: true })
  }

  async clearConnectionPassword(connectionId: string, password?: string): Promise<PlatformConnection> {
    const connection = await this.requireConnection(connectionId)
    let secret = await this.vault.revealForRequest(connection.authRef)
    if (!secret && password) {
      const ok = await this.vault.unlock(password)
      if (!ok) throw Object.assign(new Error('Wrong vault password'), { code: 'VAULT_UNLOCK_FAILED' })
      secret = await this.vault.revealForRequest(connection.authRef)
    }
    if (!secret) {
      throw Object.assign(new Error('Credentials are locked or missing'), { code: 'VAULT_LOCKED' })
    }
    await this.vault.put(connection.authRef, secret, true, false)
    return this.connections.update(connectionId, { persistSecrets: true, lockSecrets: false })
  }

  private async ensureVaultPassword(password?: string): Promise<void> {
    if (await this.vault.hasDek()) return
    if (!password) {
      throw Object.assign(new Error('Vault password is required'), { code: 'VAULT_PASSWORD_REQUIRED' })
    }
    if (await this.vault.hasMeta()) {
      const ok = await this.vault.unlock(password)
      if (!ok) throw Object.assign(new Error('Wrong vault password'), { code: 'VAULT_UNLOCK_FAILED' })
      return
    }
    await this.vault.setupPersistPassword(password)
  }

  private async requireConnection(id: string): Promise<PlatformConnection> {
    if (id === ALL_INSTANCES_ID) {
      throw Object.assign(new Error('This action requires a single instance'), { code: 'SINGLE_INSTANCE_REQUIRED' })
    }
    const connection = await this.connections.get(id)
    if (!connection) throw new Error('Connection not found')
    return connection
  }
}
