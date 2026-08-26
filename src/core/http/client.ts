import { joinApiPath } from './base-url'
import { EnvelopeError, unwrapEnvelope } from './envelope'
import { isAbortError, mapHttpError, type StructuredError } from './errors'
import { maskHeaders, redactSecrets, safeLog } from '../security/redact'
import type { AuthMode } from '@/domain/models'

export const ADMIN_UI_REQUEST_HEADER = 'X-Admin-UI-Request'

export interface AuthSecret {
  mode: AuthMode
  secret: string
}

export interface HttpRequest {
  apiBase: string
  path: string
  method?: string
  query?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  auth: AuthSecret
  timezone?: string
  acceptLanguage?: string
  signal?: AbortSignal
  etag?: string | null
  timeoutMs?: number
}

export interface HttpResponse<T> {
  data: T
  etag?: string | null
  notModified?: boolean
  status: number
}

export interface HttpClientOptions {
  fetchImpl?: typeof fetch
  now?: () => Date
}

export class HttpClientError extends Error {
  readonly structured: StructuredError
  constructor(structured: StructuredError) {
    super(structured.message)
    this.name = 'HttpClientError'
    this.structured = structured
  }
}

export function buildAdminHeaders(auth: AuthSecret, acceptLanguage = 'zh-CN'): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'Accept-Language': acceptLanguage,
    [ADMIN_UI_REQUEST_HEADER]: '1',
  }
  if (auth.mode === 'admin-api-key') {
    headers['x-api-key'] = auth.secret
  } else {
    headers.Authorization = `Bearer ${auth.secret}`
  }
  return headers
}

export class TypedHttpClient {
  private readonly fetchImpl: typeof fetch

  constructor(opts: HttpClientOptions = {}) {
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch.bind(globalThis)
  }

  async request<T>(req: HttpRequest): Promise<HttpResponse<T>> {
    const method = (req.method ?? 'GET').toUpperCase()
    const url = new URL(joinApiPath(req.apiBase, req.path))
    const query = { ...(req.query ?? {}) }
    if (method === 'GET') {
      query.timezone = req.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    }
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === '') continue
      url.searchParams.set(key, typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value))
    }

    const headers = buildAdminHeaders(req.auth, req.acceptLanguage)
    if (req.etag) headers['If-None-Match'] = req.etag

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), req.timeoutMs ?? 15_000)
    const onParentAbort = () => controller.abort()
    req.signal?.addEventListener('abort', onParentAbort)

    safeLog('info', 'http.request', { method, url: url.pathname, headers: maskHeaders(headers) })

    try {
      const response = await this.fetchImpl(url.toString(), {
        method,
        headers,
        body: req.body === undefined ? undefined : JSON.stringify(req.body),
        signal: controller.signal,
      })

      if (response.status === 304) {
        return { data: undefined as T, etag: response.headers.get('etag'), notModified: true, status: 304 }
      }

      const text = await response.text()
      let json: unknown = null
      if (text) {
        try {
          json = JSON.parse(text)
        } catch {
          json = { message: text.slice(0, 500) }
        }
      }

      if (!response.ok) {
        const payload = (json && typeof json === 'object' ? json : {}) as Record<string, unknown>
        throw new HttpClientError(
          mapHttpError({
            status: response.status,
            code: (payload.code as string | number | undefined) ?? undefined,
            message: String(payload.message || payload.detail || response.statusText || 'Request failed'),
            body: redactSecrets(text),
            url: url.pathname,
          }),
        )
      }

      try {
        const data = unwrapEnvelope<T>(json, response.status)
        return { data, etag: response.headers.get('etag'), status: response.status }
      } catch (error) {
        if (error instanceof EnvelopeError) {
          throw new HttpClientError(
            mapHttpError({
              status: error.status ?? response.status,
              code: error.code,
              message: error.message,
              url: url.pathname,
            }),
          )
        }
        throw error
      }
    } catch (error) {
      if (error instanceof HttpClientError) throw error
      if (isAbortError(error) || (error instanceof Error && error.message.includes('abort'))) {
        throw new HttpClientError({ kind: 'timeout', message: 'Request aborted or timed out', url: url.pathname })
      }
      throw new HttpClientError(
        mapHttpError({
          status: 0,
          message: error instanceof Error ? error.message : 'Network error. Please check your connection.',
          url: url.pathname,
        }),
      )
    } finally {
      clearTimeout(timeout)
      req.signal?.removeEventListener('abort', onParentAbort)
    }
  }
}
