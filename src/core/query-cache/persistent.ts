import type { KeyValueStorage } from '@/core/security/storage'

export const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const PREFIX = 'query-cache:'

interface Stored<T> {
  fetchedAt: string
  data: T
}

export class PersistentCache {
  constructor(private readonly storage: KeyValueStorage) {}

  async get<T>(key: string, now = Date.now()): Promise<T | undefined> {
    const stored = (await this.storage.get(PREFIX + key)) as Stored<T> | undefined
    if (!stored?.fetchedAt) return undefined
    const age = now - Date.parse(stored.fetchedAt)
    if (!Number.isFinite(age) || age > CACHE_TTL_MS) {
      await this.storage.remove(PREFIX + key)
      return undefined
    }
    return stored.data
  }

  async set<T>(key: string, data: T, now = Date.now()): Promise<void> {
    const stored: Stored<T> = { fetchedAt: new Date(now).toISOString(), data }
    await this.storage.set(PREFIX + key, stored)
  }

  async invalidate(prefix?: string): Promise<void> {
    const all = await this.storage.getAll()
    const needle = PREFIX + (prefix ?? '')
    for (const key of Object.keys(all)) {
      if (key.startsWith(needle)) await this.storage.remove(key)
    }
  }
}
