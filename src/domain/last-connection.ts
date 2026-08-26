import { ALL_INSTANCES_ID } from './models'

export const LAST_CONNECTION_KEY = 'sub2api:last-connection'

export function readLastConnection(): string | null {
  try {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(LAST_CONNECTION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return typeof parsed === 'string' && parsed.trim() ? parsed : null
  } catch {
    return null
  }
}

export function writeLastConnection(id: string): void {
  try {
    if (typeof localStorage === 'undefined') return
    localStorage.setItem(LAST_CONNECTION_KEY, JSON.stringify(id))
  } catch {}
}

export function resolveLastConnection(saved: string | null | undefined, ids: string[]): string {
  if (saved === ALL_INSTANCES_ID) return ALL_INSTANCES_ID
  if (saved && ids.includes(saved)) return saved
  return ALL_INSTANCES_ID
}
