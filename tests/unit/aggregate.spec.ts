import { describe, expect, it } from 'vitest'
import { aggregateQuotaWindows, aggregateTodaySnapshots } from '@/domain/aggregate'
import type { NormalizedAccount, TodaySnapshot } from '@/domain/models'

const snap = (id: string, extra: Partial<TodaySnapshot> = {}): TodaySnapshot => ({
  connectionId: id,
  date: '2026-08-26',
  timezone: 'Asia/Shanghai',
  requests: 100,
  tokens: 1000,
  actualCost: 1,
  accountCost: 0.5,
  errorCount: 2,
  rpm: 3,
  tpm: 10,
  models: [{ model: 'm', requests: 100, tokens: 1000, actualCost: 1 }],
  trend: [{ at: '2026-08-26T00:00:00Z', tokens: 1000, requests: 100 }],
  userSeries: [],
  fetchedAt: '2026-08-26T01:00:00Z',
  ...extra,
})

describe('aggregateTodaySnapshots', () => {
  it('sums additive metrics and keeps partial failures', () => {
    const out = aggregateTodaySnapshots(
      [
        { connectionId: 'a', connectionName: 'A', ok: true, data: snap('a') },
        { connectionId: 'b', connectionName: 'B', ok: false, error: { message: 'offline' } },
        { connectionId: 'c', connectionName: 'C', ok: true, data: snap('c', { requests: 50, tokens: 500, actualCost: 0.2, errorCount: 1 }) },
      ],
      'Asia/Shanghai',
      '2026-08-26',
    )
    expect(out.requests).toBe(150)
    expect(out.tokens).toBe(1500)
    expect(out.actualCost).toBeCloseTo(1.2)
    expect(out.errorCount).toBe(3)
    expect(out.failures).toHaveLength(1)
    expect(out.failures[0].connectionName).toBe('B')
  })

  it('does not average remaining percents', () => {
    const accounts: NormalizedAccount[] = [
      {
        uid: 'a:1',
        connectionId: 'a',
        id: 1,
        name: 'one',
        upstreamPlatform: 'openai',
        status: 'active',
        quotaWindows: [{ id: 'five-hour', label: '5h', remainingPercent: 80, state: 'healthy', resetAt: '2026-08-26T10:00:00Z' }],
      },
      {
        uid: 'b:1',
        connectionId: 'b',
        id: 1,
        name: 'two',
        upstreamPlatform: 'anthropic',
        status: 'active',
        quotaWindows: [{ id: 'five-hour', label: '5h', remainingPercent: 10, state: 'critical', resetAt: '2026-08-26T08:00:00Z' }],
      },
    ]
    const quota = aggregateQuotaWindows(accounts)
    expect(quota.lowestRemaining).toBe(10)
    expect(quota.criticalCount).toBe(1)
    expect(quota.nearestResetAt).toBe('2026-08-26T08:00:00Z')
    expect(quota.lowestRemaining).not.toBe(45)
  })

  it('counts critical accounts once even if both 5h and 7d are bad', () => {
    const accounts: NormalizedAccount[] = [
      {
        uid: 'a:1',
        connectionId: 'a',
        id: 1,
        name: 'one',
        upstreamPlatform: 'openai',
        status: 'active',
        quotaWindows: [
          { id: 'five-hour', label: '5h', remainingPercent: 0, state: 'exhausted' },
          { id: 'seven-day', label: '7d', remainingPercent: 5, state: 'critical' },
        ],
      },
    ]
    expect(aggregateQuotaWindows(accounts).criticalCount).toBe(1)
  })

  it('merges per-user token series across instances', () => {
    const out = aggregateTodaySnapshots(
      [
        {
          connectionId: 'a',
          ok: true,
          data: snap('a', {
            userSeries: [
              {
                uid: '10',
                label: 'ops',
                points: [
                  { at: '2026-08-26T00:00:00Z', tokens: 100, requests: 2 },
                  { at: '2026-08-26T12:00:00Z', tokens: 300, requests: 5 },
                ],
              },
            ],
          }),
        },
        {
          connectionId: 'b',
          ok: true,
          data: snap('b', {
            userSeries: [
              {
                uid: '10',
                label: 'ops',
                points: [{ at: '2026-08-26T00:00:00Z', tokens: 50, requests: 1 }],
              },
              {
                uid: '11',
                label: 'dev',
                points: [{ at: '2026-08-26T12:00:00Z', tokens: 900, requests: 4 }],
              },
            ],
          }),
        },
      ],
      'UTC',
      '2026-08-26',
    )
    expect(out.userSeries.map((s) => s.label)).toEqual(['dev', 'ops', 'ops'])
    expect(out.userSeries[0].points[0].tokens).toBe(900)
    const alphaOps = out.userSeries.find((s) => s.uid === 'a:10')
    expect(alphaOps?.points.map((p) => p.tokens)).toEqual([100, 300])
  })

  it('sums normal/rate-limited/error account counts', () => {
    const out = aggregateTodaySnapshots(
      [
        { connectionId: 'a', ok: true, data: snap('a', { normalAccounts: 2, rateLimitedAccounts: 1, errorAccounts: 0 }) },
        { connectionId: 'b', ok: true, data: snap('b', { requests: 0, tokens: 0, actualCost: 0, errorCount: 0, normalAccounts: 1, rateLimitedAccounts: 0, errorAccounts: 3 }) },
      ],
      'UTC',
      '2026-08-26',
    )
    expect(out.normalAccounts).toBe(3)
    expect(out.rateLimitedAccounts).toBe(1)
    expect(out.errorAccounts).toBe(3)
  })
})
