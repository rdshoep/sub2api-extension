export interface KeyValueStorage {
  get(key: string): Promise<unknown>
  set(key: string, value: unknown): Promise<void>
  remove(key: string): Promise<void>
  getAll(): Promise<Record<string, unknown>>
}

export function memoryStorage(): KeyValueStorage {
  const map = new Map<string, unknown>()
  return {
    async get(key) {
      return map.has(key) ? map.get(key) : undefined
    },
    async set(key, value) {
      map.set(key, value)
    },
    async remove(key) {
      map.delete(key)
    },
    async getAll() {
      return Object.fromEntries(map.entries())
    },
  }
}

export function webStorage(area: 'localStorage' | 'sessionStorage', prefix = 'sub2api:'): KeyValueStorage {
  const bucket = () => {
    const store = globalThis[area]
    if (!store) throw new Error(`${area} is unavailable`)
    return store
  }
  return {
    async get(key) {
      const raw = bucket().getItem(prefix + key)
      return raw == null ? undefined : JSON.parse(raw)
    },
    async set(key, value) {
      bucket().setItem(prefix + key, JSON.stringify(value))
    },
    async remove(key) {
      bucket().removeItem(prefix + key)
    },
    async getAll() {
      const store = bucket()
      const out: Record<string, unknown> = {}
      for (let i = 0; i < store.length; i += 1) {
        const full = store.key(i)
        if (!full?.startsWith(prefix)) continue
        const raw = store.getItem(full)
        if (raw == null) continue
        try {
          out[full.slice(prefix.length)] = JSON.parse(raw)
        } catch {
          continue
        }
      }
      return out
    },
  }
}

export function webextStorage(area: 'local' | 'session'): KeyValueStorage {
  const bucket = () => {
    const browserApi = (globalThis as { browser?: { storage?: Record<string, any> }; chrome?: { storage?: Record<string, any> } }).browser
      ?? (globalThis as { chrome?: { storage?: Record<string, any> } }).chrome
    const storage = browserApi?.storage?.[area]
    if (!storage) {
      throw new Error(`browser.storage.${area} is unavailable`)
    }
    return storage
  }
  return {
    async get(key) {
      const result = await bucket().get(key)
      return result?.[key]
    },
    async set(key, value) {
      await bucket().set({ [key]: value })
    },
    async remove(key) {
      await bucket().remove(key)
    },
    async getAll() {
      return (await bucket().get(null)) ?? {}
    },
  }
}
