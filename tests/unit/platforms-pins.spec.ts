import { describe, expect, it } from 'vitest'
import { normalizePlatform, platformMeta, sortAccountsByPin } from '@/domain/platforms'

describe('platform identity', () => {
  it('maps aliases to canonical ids with labels', () => {
    expect(normalizePlatform('Claude')).toBe('anthropic')
    expect(platformMeta('openai').label).toBe('OpenAI')
    expect(platformMeta('grok').id).toBe('grok')
  })
})

describe('sortAccountsByPin', () => {
  it('keeps pinned uids first in pin order', () => {
    const accounts = [
      { uid: 'a:1', name: 'one' },
      { uid: 'a:2', name: 'two' },
      { uid: 'a:3', name: 'three' },
    ]
    const sorted = sortAccountsByPin(accounts, ['a:3', 'a:1'])
    expect(sorted.map((a) => a.uid)).toEqual(['a:3', 'a:1', 'a:2'])
  })
})
