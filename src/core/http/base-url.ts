export interface NormalizedBaseUrl {
  input: string
  origin: string
  siteBase: string
  apiBase: string
  hostPermissionOrigin: string
}

const API_SUFFIX = '/api/v1'

export function normalizeBaseUrl(raw: string): NormalizedBaseUrl {
  const trimmed = String(raw ?? '').trim()
  if (!trimmed) {
    throw new Error('Base URL is required')
  }
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('Base URL must be an absolute http(s) URL')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Base URL must use http or https')
  }

  const origin = parsed.origin
  let path = parsed.pathname.replace(/\/+$/, '') || ''
  if (path === API_SUFFIX || path.endsWith(API_SUFFIX)) {
    path = path.slice(0, -API_SUFFIX.length)
  }
  const siteBase = `${origin}${path}`.replace(/\/+$/, '')
  const apiBase = `${siteBase}${API_SUFFIX}`
  return {
    input: trimmed,
    origin,
    siteBase,
    apiBase,
    hostPermissionOrigin: `${origin}/`,
  }
}

export function joinApiPath(apiBase: string, path: string): string {
  const base = apiBase.replace(/\/+$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  if (suffix === '/api/v1' || suffix.startsWith('/api/v1/')) {
    return `${base}${suffix.slice('/api/v1'.length) || ''}`
  }
  return `${base}${suffix}`
}
