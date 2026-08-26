import { redactSecrets } from './redact'
import type { AuditEntry } from '@/domain/models'
import type { KeyValueStorage } from './storage'

const KEY = 'audit:entries'
const MAX = 200

function sanitize(value: unknown): unknown {
  if (value == null) return value
  if (typeof value === 'string') return redactSecrets(value)
  if (Array.isArray(value)) return value.map(sanitize)
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const lower = k.toLowerCase()
      if (['secret', 'token', 'authorization', 'api_key', 'apikey', 'password', 'jwt', 'cookie'].some((s) => lower.includes(s))) {
        out[k] = '[REDACTED]'
      } else {
        out[k] = sanitize(v)
      }
    }
    return out
  }
  return value
}

export class AuditLog {
  constructor(private readonly storage: KeyValueStorage) {}

  async append(entry: Omit<AuditEntry, 'id' | 'at'> & { id?: string; at?: string }): Promise<AuditEntry> {
    const full: AuditEntry = {
      id: entry.id ?? globalThis.crypto.randomUUID(),
      at: entry.at ?? new Date().toISOString(),
      connectionId: entry.connectionId,
      action: entry.action,
      target: entry.target,
      reason: redactSecrets(entry.reason),
      before: sanitize(entry.before),
      after: sanitize(entry.after),
      result: entry.result,
      message: entry.message ? redactSecrets(entry.message) : undefined,
    }
    const existing = ((await this.storage.get(KEY)) as AuditEntry[] | undefined) ?? []
    existing.unshift(full)
    await this.storage.set(KEY, existing.slice(0, MAX))
    return full
  }

  async list(): Promise<AuditEntry[]> {
    return ((await this.storage.get(KEY)) as AuditEntry[] | undefined) ?? []
  }
}
