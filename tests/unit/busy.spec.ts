import { describe, expect, it } from 'vitest'
import { beginRequest, endRequest, isBusy, pendingRequests, shouldTrackPayload } from '@/core/messaging/busy'

describe('request busy tracking', () => {
  it('ignores cache-only payloads', () => {
    expect(shouldTrackPayload({ cacheOnly: true })).toBe(false)
    expect(shouldTrackPayload({ cacheOnly: false })).toBe(true)
    expect(shouldTrackPayload({})).toBe(true)
  })

  it('counts inflight requests', () => {
    while (pendingRequests.value > 0) endRequest()
    expect(isBusy.value).toBe(false)
    beginRequest()
    beginRequest()
    expect(isBusy.value).toBe(true)
    expect(pendingRequests.value).toBe(2)
    endRequest()
    endRequest()
    expect(isBusy.value).toBe(false)
  })
})
