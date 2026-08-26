import { describe, expect, it } from 'vitest'
import { ALL_INSTANCES_ID } from '@/domain/models'
import { LAST_CONNECTION_KEY, readLastConnection, resolveLastConnection, writeLastConnection } from '@/domain/last-connection'

describe('resolveLastConnection', () => {
  it('keeps the all-instances tab', () => {
    expect(resolveLastConnection(ALL_INSTANCES_ID, ['a', 'b'])).toBe(ALL_INSTANCES_ID)
  })

  it('restores a still-present instance', () => {
    expect(resolveLastConnection('b', ['a', 'b'])).toBe('b')
  })

  it('falls back when the saved instance was removed', () => {
    expect(resolveLastConnection('gone', ['a'])).toBe(ALL_INSTANCES_ID)
    expect(resolveLastConnection(null, ['a'])).toBe(ALL_INSTANCES_ID)
  })
})

describe('last connection persistence', () => {
  it('stores a JSON string so chrome/local storage enumeration can parse it', () => {
    const mem: Record<string, string> = {}
    const ls = {
      getItem: (key: string) => mem[key] ?? null,
      setItem: (key: string, value: string) => {
        mem[key] = value
      },
      removeItem: (key: string) => {
        delete mem[key]
      },
    }
    Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true })
    writeLastConnection('conn-1')
    expect(JSON.parse(mem[LAST_CONNECTION_KEY] || '')).toBe('conn-1')
    expect(readLastConnection()).toBe('conn-1')
  })
})
