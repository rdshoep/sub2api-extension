import { describe, expect, it } from 'vitest'
import { capabilityFallback } from '@/providers/sub2api/capabilities'
import { assertWritesAllowed, buildConfirmation, readAfterWriteChanged, withDoubleSubmitGuard } from '@/core/security/write-guard'
import type { PlatformConnection } from '@/domain/models'
import { createTestKernel } from '../helpers/kernel'
import { ALPHA_ORIGIN } from '../mocks/fixtures'

const conn = (over: Partial<PlatformConnection> = {}): PlatformConnection => ({
  id: 'c1',
  name: 'n',
  baseUrl: ALPHA_ORIGIN,
  origin: ALPHA_ORIGIN,
  apiBase: `${ALPHA_ORIGIN}/api/v1`,
  authRef: 'r',
  authMode: 'admin-api-key',
  readOnly: false,
  persistSecrets: false,
  alertsEnabled: false,
  status: 'online',
  capabilities: { 'users.balance.write': 'supported' },
  createdAt: '2026-08-26T00:00:00Z',
  ...over,
})

describe('capability fallback', () => {
  it('treats missing capability as unsupported', () => {
    expect(capabilityFallback(undefined)).toBe('unsupported')
  })
})

describe('write confirmation', () => {
  it('requires reason and target identity', () => {
    expect(() =>
      buildConfirmation({
        action: 'user.balance.adjust',
        connectionId: 'c1',
        connectionName: 'n',
        targetType: 'user',
        targetId: 10,
        targetLabel: 'ops@example.test',
        reason: '',
        before: { balance: 1 },
      }),
    ).toThrow(/Reason/)
  })

  it('blocks read-only and unsupported', () => {
    expect(() => assertWritesAllowed(conn({ readOnly: true }), 'users.balance.write')).toThrow(/read-only/i)
    expect(() =>
      assertWritesAllowed(conn({ capabilities: { 'users.balance.write': 'unsupported' } }), 'users.balance.write'),
    ).toThrow(/unsupported/i)
    expect(() => assertWritesAllowed(conn({ capabilities: {} }), 'users.balance.write')).toThrow(/unsupported/i)
  })

  it('detects read-after-write change', () => {
    expect(readAfterWriteChanged({ balance: 1 }, { balance: 2 })).toBe(true)
  })

  it('guards double submit', async () => {
    let started = 0
    const hang = withDoubleSubmitGuard('k', async () => {
      started += 1
      await new Promise((r) => setTimeout(r, 30))
      return 'ok'
    })
    await expect(withDoubleSubmitGuard('k', async () => 'nope')).rejects.toThrow(/already in progress/)
    await hang
    expect(started).toBe(1)
  })
})

describe('kernel writes', () => {
  it('adjusts balance with before/after and read-after-write', async () => {
    const { kernel } = createTestKernel()
    const added = await kernel.addConnection({
      name: 'Alpha',
      baseUrl: ALPHA_ORIGIN,
      authMode: 'admin-api-key',
      secret: 'session-only',
      readOnly: false,
    })
    const result = await kernel.adjustUserBalance({
      connectionId: added.id,
      userId: 10,
      operation: 'set',
      amount: 20,
      reason: 'test top-up',
    })
    expect(result.before.balance).toBe(12.5)
    expect(result.after.balance).toBe(20)
    const audit = await kernel.audit.list()
    expect(audit[0].reason).toBe('test top-up')
    expect(JSON.stringify(audit)).not.toContain('session-only')
  })

  it('resets account quota then reads refreshed 5h/7d windows', async () => {
    const { kernel } = createTestKernel()
    const added = await kernel.addConnection({
      name: 'Alpha',
      baseUrl: ALPHA_ORIGIN,
      authMode: 'admin-api-key',
      secret: 'session-only',
      readOnly: false,
    })
    const result = await kernel.resetAccountQuota({
      connectionId: added.id,
      accountId: 1,
      reason: 'reset local quota',
    })
    const fiveBefore = result.before.quotaWindows.find((w) => w.id === 'five-hour')
    const fiveAfter = result.after.quotaWindows.find((w) => w.id === 'five-hour')
    expect(fiveBefore?.remainingPercent).toBe(40)
    expect(fiveAfter?.remainingPercent).toBe(100)
  })
})
