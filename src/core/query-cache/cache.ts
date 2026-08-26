import type { CacheEntry, QuotaSource } from '@/domain/models'

export class QueryCache {
  private readonly map = new Map<string, CacheEntry<unknown>>()

  get<T>(key: string): CacheEntry<T> | undefined {
    return this.map.get(key) as CacheEntry<T> | undefined
  }

  set<T>(key: string, data: T, opts: { ttlMs?: number; source?: QuotaSource | 'mixed' } = {}): CacheEntry<T> {
    const fetchedAt = new Date().toISOString()
    const ttl = opts.ttlMs ?? 30_000
    const entry: CacheEntry<T> = {
      data,
      fetchedAt,
      source: opts.source ?? 'passive',
      staleAt: new Date(Date.now() + ttl).toISOString(),
    }
    this.map.set(key, entry)
    return entry
  }

  invalidate(prefix?: string): void {
    if (!prefix) {
      this.map.clear()
      return
    }
    for (const key of [...this.map.keys()]) {
      if (key.startsWith(prefix)) this.map.delete(key)
    }
  }

  isFresh(key: string, now = Date.now()): boolean {
    const entry = this.map.get(key)
    if (!entry) return false
    return Date.parse(entry.staleAt) > now
  }
}
