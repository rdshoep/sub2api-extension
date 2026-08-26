import { describe, expect, it } from 'vitest'
import { CACHE_TTL_MS, PersistentCache } from '@/core/query-cache/persistent'
import { memoryStorage } from '@/core/security/storage'

describe('PersistentCache', () => {
  it('returns data within one day and drops older entries', async () => {
    const cache = new PersistentCache(memoryStorage())
    await cache.set('overview', { requests: 9 }, Date.parse('2026-08-26T00:00:00Z'))
    expect(await cache.get('overview', Date.parse('2026-08-26T12:00:00Z'))).toEqual({ requests: 9 })
    expect(await cache.get('overview', Date.parse('2026-08-26T00:00:00Z') + CACHE_TTL_MS + 1)).toBeUndefined()
  })
})
