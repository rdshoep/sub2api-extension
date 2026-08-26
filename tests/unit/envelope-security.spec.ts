import { describe, expect, it } from 'vitest'
import { unwrapEnvelope, EnvelopeError } from '@/core/http/envelope'
import { mapHttpError } from '@/core/http/errors'
import { redactSecrets, maskHeaders } from '@/core/security/redact'
import { buildAdminHeaders } from '@/core/http/client'

describe('unwrapEnvelope', () => {
  it('returns data when code is 0', () => {
    expect(unwrapEnvelope({ code: 0, message: 'ok', data: { version: '1' } })).toEqual({ version: '1' })
  })

  it('throws on non-zero code', () => {
    expect(() => unwrapEnvelope({ code: 401, message: 'nope', data: null })).toThrow(EnvelopeError)
  })
})

describe('mapHttpError', () => {
  it('maps ops disabled 404', () => {
    const err = mapHttpError({ status: 404, message: 'Ops monitoring is disabled' })
    expect(err.kind).toBe('feature_disabled')
  })

  it('maps 401 to unauthorized', () => {
    expect(mapHttpError({ status: 401, message: 'no' }).kind).toBe('unauthorized')
  })
})

describe('redactSecrets', () => {
  it('redacts bearer, cookie, and api keys', () => {
    const text = redactSecrets('Authorization: Bearer abc.def Cookie: session=xyz x-api-key: super-secret')
    expect(text).not.toContain('abc.def')
    expect(text).not.toContain('super-secret')
    expect(text).not.toContain('session=xyz')
    expect(text).toMatch(/REDACTED/)
  })

  it('masks auth headers', () => {
    const masked = maskHeaders({ Authorization: 'Bearer secret', 'x-api-key': 'k', Accept: 'application/json' })
    expect(masked.Authorization).toBe('[REDACTED]')
    expect(masked['x-api-key']).toBe('[REDACTED]')
    expect(masked.Accept).toBe('application/json')
  })
})

describe('buildAdminHeaders', () => {
  it('sends x-api-key and admin UI marker', () => {
    const headers = buildAdminHeaders({ mode: 'admin-api-key', secret: 'not-logged' }, 'zh-CN')
    expect(headers['x-api-key']).toBe('not-logged')
    expect(headers['X-Admin-UI-Request']).toBe('1')
    expect(headers['Accept-Language']).toBe('zh-CN')
  })

  it('sends bearer jwt', () => {
    const headers = buildAdminHeaders({ mode: 'jwt', secret: 'token' })
    expect(headers.Authorization).toBe('Bearer token')
  })
})
