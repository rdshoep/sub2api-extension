import { describe, expect, it } from 'vitest'
import { joinApiPath, normalizeBaseUrl } from '@/core/http/base-url'

describe('normalizeBaseUrl', () => {
  it('normalizes origin without /api/v1', () => {
    const out = normalizeBaseUrl('https://alpha.example.test')
    expect(out.origin).toBe('https://alpha.example.test')
    expect(out.apiBase).toBe('https://alpha.example.test/api/v1')
    expect(out.hostPermissionOrigin).toBe('https://alpha.example.test/')
  })

  it('strips /api/v1 suffix', () => {
    const out = normalizeBaseUrl('https://alpha.example.test/api/v1/')
    expect(out.apiBase).toBe('https://alpha.example.test/api/v1')
    expect(out.siteBase).toBe('https://alpha.example.test')
  })

  it('keeps a site prefix before /api/v1', () => {
    const out = normalizeBaseUrl('https://alpha.example.test/sub2api/api/v1')
    expect(out.apiBase).toBe('https://alpha.example.test/sub2api/api/v1')
  })

  it('rejects relative urls', () => {
    expect(() => normalizeBaseUrl('/api/v1')).toThrow(/absolute/)
  })

  it('joins admin paths onto apiBase', () => {
    expect(joinApiPath('https://alpha.example.test/api/v1', '/admin/accounts')).toBe(
      'https://alpha.example.test/api/v1/admin/accounts',
    )
  })
})
