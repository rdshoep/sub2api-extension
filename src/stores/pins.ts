import { defineStore } from 'pinia'
import { sortAccountsByPin } from '@/domain/platforms'

const KEY = 'sub2api:pinned-accounts'

function readPins(): string[] {
  try {
    const raw = localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}

export const usePinStore = defineStore('pins', {
  state: () => ({
    uids: readPins() as string[],
  }),
  actions: {
    isPinned(uid: string): boolean {
      return this.uids.includes(uid)
    },
    toggle(uid: string) {
      if (this.uids.includes(uid)) {
        this.uids = this.uids.filter((id) => id !== uid)
      } else {
        this.uids = [uid, ...this.uids]
      }
      try {
        localStorage.setItem(KEY, JSON.stringify(this.uids))
      } catch {}
    },
    sort<T extends { uid: string }>(accounts: T[]): T[] {
      return sortAccountsByPin(accounts, this.uids)
    },
  },
})
