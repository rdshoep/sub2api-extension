import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { TypedHttpClient } from '@/core/http/client'
import { ALPHA_ORIGIN, envelope } from '../mocks/fixtures'

const server = setupServer(
  http.get(`${ALPHA_ORIGIN}/api/v1/admin/system/version`, ({ request }) => {
    const tz = new URL(request.url).searchParams.get('timezone')
    expect(tz).toBeTruthy()
    expect(request.headers.get('x-api-key')).toBe('session-only-not-a-real-admin-key')
    expect(request.headers.get('X-Admin-UI-Request')).toBe('1')
    return HttpResponse.json(envelope({ version: '2.1.0-alpha' }))
  }),
)

describe('MSW HTTP contract', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('sends timezone and unwraps {code,message,data}', async () => {
    const client = new TypedHttpClient()
    const res = await client.request<{ version: string }>({
      apiBase: `${ALPHA_ORIGIN}/api/v1`,
      path: '/admin/system/version',
      auth: { mode: 'admin-api-key', secret: 'session-only-not-a-real-admin-key' },
      timezone: 'Asia/Shanghai',
    })
    expect(res.data.version).toBe('2.1.0-alpha')
  })
})
