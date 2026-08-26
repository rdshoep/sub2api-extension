import { defineStore } from 'pinia'
import { ALL_INSTANCES_ID } from '@/domain/models'
import { readLastConnection, resolveLastConnection, writeLastConnection } from '@/domain/last-connection'
import type { OverviewRange } from '@/domain/range'

export type ConsoleView = 'overview' | 'accounts' | 'users' | 'errors' | 'instances'

function readBool(key: string, fallback: boolean): boolean {
  try {
    if (typeof localStorage === 'undefined') return fallback
    const raw = localStorage.getItem(key)
    if (raw === '1' || raw === 'true') return true
    if (raw === '0' || raw === 'false') return false
  } catch {}
  return fallback
}

export const useUiStore = defineStore('ui', {
  state: () => ({
    view: 'overview' as ConsoleView,
    connectionId: readLastConnection() || ALL_INSTANCES_ID,
    overviewRange: 'today' as OverviewRange,
    theme: (typeof localStorage !== 'undefined' ? (localStorage.getItem('theme') as 'light' | 'dark' | null) : null) || 'light',
    overviewAutoRefresh: readBool('sub2api:overview-auto-refresh', false),
    lastError: '',
  }),
  actions: {
    setView(view: ConsoleView) {
      this.view = view
    },
    setConnection(id: string) {
      this.connectionId = id
      writeLastConnection(id)
    },
    ensureConnection(ids: string[]) {
      const next = resolveLastConnection(this.connectionId, ids)
      if (next !== this.connectionId) this.setConnection(next)
    },
    setOverviewRange(range: OverviewRange) {
      this.overviewRange = range
    },
    setOverviewAutoRefresh(on: boolean) {
      this.overviewAutoRefresh = on
      try {
        localStorage.setItem('sub2api:overview-auto-refresh', on ? '1' : '0')
      } catch {}
    },
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark'
      try {
        localStorage.setItem('theme', this.theme)
      } catch {}
      document.documentElement.classList.toggle('dark', this.theme === 'dark')
    },
    applyTheme() {
      document.documentElement.classList.toggle('dark', this.theme === 'dark')
    },
  },
})
