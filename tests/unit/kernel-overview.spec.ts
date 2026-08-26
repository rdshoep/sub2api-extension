import { describe, expect, it } from 'vitest'
import { createTestKernel } from '../helpers/kernel'
import { ALPHA_ORIGIN, BETA_ORIGIN } from '../mocks/fixtures'
import { ALL_INSTANCES_ID } from '@/domain/models'

describe('kernel multi-instance overview', () => {
  it('adds two instances and sums additive metrics', async () => {
    const { kernel } = createTestKernel()
    await kernel.addConnection({
      name: 'Alpha',
      baseUrl: ALPHA_ORIGIN,
      authMode: 'admin-api-key',
      secret: 'session-alpha',
      readOnly: true,
    })
    await kernel.addConnection({
      name: 'Beta',
      baseUrl: BETA_ORIGIN,
      authMode: 'admin-api-key',
      secret: 'session-beta',
      readOnly: true,
    })
    const overview = await kernel.getOverview(ALL_INSTANCES_ID)
    expect(overview.aggregated.requests).toBe(150)
    expect(overview.aggregated.tokens).toBe(7000)
    expect(overview.aggregated.failures).toHaveLength(0)
    expect(overview.quota.lowestRemaining).not.toBeNull()
    const users = await kernel.listUsers(ALL_INSTANCES_ID)
    expect(users.items.length).toBeGreaterThan(0)
    expect(users.items[0].balance).toBe(12.5)
    expect(users.items[0].todayActualCost).toBe(1.25)
    expect(overview.aggregated.userSeries.some((s) => s.label === 'ops')).toBe(true)
    expect(overview.aggregated.userSeries.some((s) => s.label === 'dev')).toBe(true)
  })

  it('serves overview from the 1-day cache then refreshes', async () => {
    const { kernel } = createTestKernel()
    await kernel.addConnection({
      name: 'Alpha',
      baseUrl: ALPHA_ORIGIN,
      authMode: 'admin-api-key',
      secret: 'session-alpha',
      readOnly: true,
    })
    await expect(kernel.getOverview(undefined, 'today', true)).rejects.toMatchObject({ code: 'NO_CACHE' })
    const fresh = await kernel.getOverview()
    const cached = await kernel.getOverview(undefined, 'today', true)
    expect(cached.aggregated.requests).toBe(fresh.aggregated.requests)
    expect(cached.aggregated.userSeries.map((s) => s.label)).toEqual(fresh.aggregated.userSeries.map((s) => s.label))
  })

  it('keeps alpha data when beta is down', async () => {
    const { kernel } = createTestKernel({ betaDown: true })
    await kernel.addConnection({
      name: 'Alpha',
      baseUrl: ALPHA_ORIGIN,
      authMode: 'admin-api-key',
      secret: 'session-alpha',
      readOnly: true,
    })
    await kernel.addConnection({
      name: 'Beta',
      baseUrl: BETA_ORIGIN,
      authMode: 'admin-api-key',
      secret: 'session-beta',
      readOnly: true,
    })
    const overview = await kernel.getOverview(ALL_INSTANCES_ID)
    expect(overview.aggregated.requests).toBe(100)
    expect(overview.aggregated.failures.some((f: { connectionName?: string }) => f.connectionName === 'Beta' || Boolean(f))).toBe(true)
  })
})
