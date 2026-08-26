import { describe, expect, it } from 'vitest'
import { TypedHttpClient } from '@/core/http/client'
import { Sub2ApiAdapter } from '@/providers/sub2api/adapter'
import { createMockFetch, resetMutableFixtures } from '../mocks/mock-fetch'
import { ALPHA_ORIGIN } from '../mocks/fixtures'
import { SUB2API_ENDPOINTS } from '@/providers/sub2api/endpoints'
import type { PlatformConnection } from '@/domain/models'

const connection: PlatformConnection = {
  id: 'alpha',
  name: 'Alpha',
  baseUrl: ALPHA_ORIGIN,
  origin: ALPHA_ORIGIN,
  apiBase: `${ALPHA_ORIGIN}/api/v1`,
  authRef: 'r',
  authMode: 'admin-api-key',
  readOnly: false,
  persistSecrets: false,
  alertsEnabled: false,
  status: 'online',
  capabilities: {},
  createdAt: '2026-08-26T00:00:00Z',
}

function ctx() {
  return {
    connection,
    auth: { mode: 'admin-api-key' as const, secret: 'session-only-not-a-real-admin-key' },
    timezone: 'Asia/Shanghai',
  }
}

describe('Sub2API adapter contract', () => {
  it('uses mapped admin paths and unwraps envelopes', async () => {
    resetMutableFixtures()
    const seen: string[] = []
    const inner = createMockFetch()
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
      const parsed = new URL(url)
      seen.push(`${(init?.method || 'GET').toUpperCase()} ${parsed.pathname}${parsed.search}`)
      return inner(input, init)
    }
    const adapter = new Sub2ApiAdapter(new TypedHttpClient({ fetchImpl }))
    const accounts = await adapter.listAccounts(ctx())
    expect(accounts.items[0].uid).toBe('alpha:1')
    const batch = await adapter.getAccountQuotaBatch(ctx(), [1, 2])
    expect(batch[1].windows.find((w) => w.id === 'five-hour')?.remainingPercent).toBe(40)
    expect(batch[2].windows.find((w) => w.id === 'five-hour')?.state).toBe('over-limit')
    const snap = await adapter.getTodaySnapshot(ctx())
    expect(snap.timezone).toBe('Asia/Shanghai')
    expect(snap.requests).toBe(100)
    expect(snap.userSeries.map((s) => s.label).sort()).toEqual(['dev', 'ops'])
    expect(seen.some((s) => s.includes('include_users_trend=true'))).toBe(true)
    const users = await adapter.listUsers(ctx(), { search: 'ops' })
    expect(users.items[0].email).toBe('ops@example.test')
    const quotas = await adapter.getUserPlatformQuotas(ctx(), 10)
    expect(quotas.some((q) => q.state === 'unlimited')).toBe(true)
    const errors = await adapter.listErrors(ctx())
    expect(errors.items[0].summary).toContain('rate limited')

    expect(seen.some((s) => s.includes(SUB2API_ENDPOINTS.accounts))).toBe(true)
    expect(seen.some((s) => s.includes(SUB2API_ENDPOINTS.accountUsageBatch))).toBe(true)
    expect(seen.some((s) => s.includes(SUB2API_ENDPOINTS.dashboardSnapshotV2))).toBe(true)
    expect(seen.some((s) => s.includes(SUB2API_ENDPOINTS.users))).toBe(true)
    expect(JSON.stringify(seen)).not.toMatch(/sk-|eyJ/)
  })
})
