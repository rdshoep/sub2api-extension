import { normalizeBaseUrl } from '@/core/http/base-url'
import type { AuthMode, PlatformConnection } from '@/domain/models'
import type { KeyValueStorage } from '@/core/security/storage'

const KEY = 'connections:v1'

export interface AddConnectionInput {
  name: string
  baseUrl: string
  authMode: AuthMode
  readOnly?: boolean
  persistSecrets?: boolean
  lockSecrets?: boolean
  alertsEnabled?: boolean
}

export class ConnectionRegistry {
  constructor(private readonly storage: KeyValueStorage) {}

  async list(): Promise<PlatformConnection[]> {
    return ((await this.storage.get(KEY)) as PlatformConnection[] | undefined) ?? []
  }

  async get(id: string): Promise<PlatformConnection | undefined> {
    return (await this.list()).find((c) => c.id === id)
  }

  async add(input: AddConnectionInput): Promise<PlatformConnection> {
    const urls = normalizeBaseUrl(input.baseUrl)
    const now = new Date().toISOString()
    const connection: PlatformConnection = {
      id: globalThis.crypto.randomUUID(),
      name: input.name.trim() || urls.origin,
      baseUrl: urls.siteBase,
      origin: urls.origin,
      apiBase: urls.apiBase,
      authRef: '',
      authMode: input.authMode,
      readOnly: input.readOnly !== false,
      persistSecrets: input.lockSecrets ? true : input.persistSecrets !== false,
      lockSecrets: Boolean(input.lockSecrets),
      alertsEnabled: Boolean(input.alertsEnabled),
      status: 'offline',
      capabilities: {},
      createdAt: now,
    }
    connection.authRef = `conn:${connection.id}`
    const all = await this.list()
    all.push(connection)
    await this.storage.set(KEY, all)
    return connection
  }

  async update(id: string, patch: Partial<PlatformConnection>): Promise<PlatformConnection> {
    const all = await this.list()
    const idx = all.findIndex((c) => c.id === id)
    if (idx < 0) throw new Error('Connection not found')
    const next = { ...all[idx], ...patch, id: all[idx].id, authRef: all[idx].authRef }
    if (patch.baseUrl) {
      const urls = normalizeBaseUrl(patch.baseUrl)
      next.baseUrl = urls.siteBase
      next.origin = urls.origin
      next.apiBase = urls.apiBase
    }
    all[idx] = next
    await this.storage.set(KEY, all)
    return next
  }

  async remove(id: string): Promise<void> {
    const all = (await this.list()).filter((c) => c.id !== id)
    await this.storage.set(KEY, all)
  }
}
