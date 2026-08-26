import {
  ALPHA_ORIGIN,
  BETA_ORIGIN,
  alphaAccounts,
  alphaErrorDetail,
  alphaErrors,
  alphaSnapshot,
  alphaUsage,
  applyBalance,
  betaSnapshot,
  currentQuotas,
  currentUser,
  envelope,
  resetDailyQuota,
  resetMutableFixtures,
} from './fixtures'

export { resetMutableFixtures }

function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extra },
  })
}

export function createMockFetch(opts: { betaDown?: boolean } = {}) {
  resetMutableFixtures()
  const usage = structuredClone(alphaUsage)
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url)
    const method = (init?.method || 'GET').toUpperCase()
    const host = `${url.protocol}//${url.host}`
    const path = url.pathname.replace(/\/+$/, '') || '/'

    if (host === BETA_ORIGIN && opts.betaDown) {
      return json({ code: 1, message: 'offline', data: null }, 503)
    }

    const isAlpha = host === ALPHA_ORIGIN || host === BETA_ORIGIN
    if (!isAlpha) return json({ code: 1, message: 'unknown host', data: null }, 404)

    const snapshot = host === BETA_ORIGIN ? betaSnapshot : alphaSnapshot

    if (path === '/api/v1/admin/system/version' && method === 'GET') {
      return json(envelope({ version: host === BETA_ORIGIN ? '2.1.0-beta' : '2.1.0-alpha' }))
    }
    if (path === '/api/v1/admin/accounts' && method === 'GET') {
      return json(envelope({ items: alphaAccounts, total: alphaAccounts.length, page: 1, page_size: 50, pages: 1 }))
    }
    if (path === '/api/v1/admin/accounts/usage/batch' && method === 'POST') {
      return json(envelope({ usage, errors: {} }))
    }
    if (/^\/api\/v1\/admin\/accounts\/(\d+)\/usage$/.test(path) && method === 'GET') {
      const id = path.split('/')[5]
      return json(envelope({ ...(usage[id] as object), source: url.searchParams.get('source') || 'passive' }))
    }
    if (/^\/api\/v1\/admin\/accounts\/(\d+)\/reset-quota$/.test(path) && method === 'POST') {
      const id = Number(path.split('/')[5])
      const current = usage[String(id)]
      if (current) {
        current.updated_at = new Date().toISOString()
        current.five_hour.utilization = 0
        current.seven_day.utilization = 0
      }
      return json(envelope(alphaAccounts.find((a) => a.id === id)))
    }
    if (path === '/api/v1/admin/users' && method === 'GET') {
      const q = url.searchParams.get('search') || ''
      const items = [currentUser()].filter((u) => !q || u.email.includes(q) || u.username.includes(q))
      return json(envelope({ items, total: items.length, page: 1, page_size: 20, pages: 1 }))
    }
    if (/^\/api\/v1\/admin\/users\/(\d+)$/.test(path) && method === 'GET') {
      return json(envelope(currentUser()))
    }
    if (/^\/api\/v1\/admin\/users\/(\d+)\/balance$/.test(path) && method === 'POST') {
      const body = JSON.parse(String(init?.body || '{}'))
      return json(envelope(applyBalance(body.operation, body.balance)))
    }
    if (/^\/api\/v1\/admin\/users\/(\d+)\/platform-quotas$/.test(path) && method === 'GET') {
      return json(envelope(currentQuotas()))
    }
    if (/^\/api\/v1\/admin\/users\/(\d+)\/platform-quotas\/reset$/.test(path) && method === 'POST') {
      return json(envelope(resetDailyQuota()))
    }
    if (path === '/api/v1/admin/dashboard/users-usage' && method === 'POST') {
      const u = currentUser()
      return json(envelope({ stats: { [String(u.id)]: { user_id: u.id, today_actual_cost: 1.25, total_actual_cost: 8 } } }))
    }
    if (path === '/api/v1/admin/dashboard/snapshot-v2' && method === 'GET') {
      return json(
        envelope({
          ...snapshot,
          trend: [
            { date: `${snapshot.start_date}T00:00:00Z`, requests: Math.round(snapshot.stats.today_requests / 2), total_tokens: Math.round(snapshot.stats.today_tokens / 2), actual_cost: snapshot.stats.today_actual_cost / 2 },
            { date: `${snapshot.start_date}T12:00:00Z`, requests: snapshot.stats.today_requests, total_tokens: snapshot.stats.today_tokens, actual_cost: snapshot.stats.today_actual_cost },
          ],
          users_trend: [
            { date: `${snapshot.start_date}T00:00:00Z`, user_id: 10, email: 'ops@example.test', username: 'ops', tokens: Math.round(snapshot.stats.today_tokens / 3), requests: 20 },
            { date: `${snapshot.start_date}T12:00:00Z`, user_id: 10, email: 'ops@example.test', username: 'ops', tokens: snapshot.stats.today_tokens, requests: 80 },
            { date: `${snapshot.start_date}T00:00:00Z`, user_id: 11, email: 'dev@example.test', username: 'dev', tokens: 800, requests: 10 },
            { date: `${snapshot.start_date}T12:00:00Z`, user_id: 11, email: 'dev@example.test', username: 'dev', tokens: 1200, requests: 15 },
          ],
        }),
      )
    }
    if (path === '/api/v1/admin/dashboard/models' && method === 'GET') {
      return json(envelope({ models: snapshot.models, start_date: snapshot.start_date, end_date: snapshot.end_date }))
    }
    if (path === '/api/v1/admin/ops/dashboard/snapshot-v2' && method === 'GET') {
      return json(envelope({ overview: { error_count_total: host === BETA_ORIGIN ? 2 : 1, error_rate: 0.01 } }))
    }
    if (path === '/api/v1/admin/ops/request-errors' && method === 'GET') {
      return json(envelope(alphaErrors))
    }
    if (path === '/api/v1/admin/ops/upstream-errors' && method === 'GET') {
      return json(envelope({ items: [], total: 0, page: 1, page_size: 20, pages: 0 }))
    }
    if (/^\/api\/v1\/admin\/ops\/request-errors\/(\d+)$/.test(path) && method === 'GET') {
      return json(envelope(alphaErrorDetail))
    }
    return json({ code: 1, message: `unmapped ${method} ${path}`, data: null }, 404)
  }
}
