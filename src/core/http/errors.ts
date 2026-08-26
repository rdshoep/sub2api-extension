export type ErrorKind =
  | 'http'
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'rate_limited'
  | 'locked'
  | 'feature_disabled'
  | 'unsupported'
  | 'timeout'
  | 'canceled'

export interface StructuredError {
  kind: ErrorKind
  status?: number
  code?: string | number
  message: string
  redactedBody?: string
  url?: string
}

const MAX_ERROR_BODY = 2048

export function mapHttpError(input: {
  status?: number
  code?: string | number
  message?: string
  body?: unknown
  url?: string
}): StructuredError {
  const status = input.status ?? 0
  const message = String(input.message || 'Request failed')
  const code = input.code
  const bodyText = typeof input.body === 'string' ? input.body : input.body != null ? JSON.stringify(input.body) : ''

  if (status === 0) {
    return { kind: 'network', message: message || 'Network error. Please check your connection.', url: input.url }
  }
  if (status === 401) {
    return { kind: 'unauthorized', status, code, message, url: input.url }
  }
  if (status === 403) {
    return { kind: 'forbidden', status, code, message, url: input.url }
  }
  if (status === 429) {
    return { kind: 'rate_limited', status, code, message, url: input.url }
  }
  if (status === 423) {
    return { kind: 'locked', status, code, message, url: input.url }
  }
  if (
    status === 404 &&
    (code === 'OPS_DISABLED' ||
      message === 'Ops monitoring is disabled' ||
      (typeof input.body === 'object' &&
        input.body !== null &&
        (input.body as { message?: string }).message === 'Ops monitoring is disabled'))
  ) {
    return {
      kind: 'feature_disabled',
      status,
      code: code ?? 'OPS_DISABLED',
      message: 'Ops monitoring is disabled',
      url: input.url,
    }
  }
  if (status === 404) {
    return { kind: 'unsupported', status, code, message, url: input.url }
  }
  return {
    kind: 'http',
    status,
    code,
    message,
    redactedBody: bodyText.slice(0, MAX_ERROR_BODY),
    url: input.url,
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    (error instanceof Error && error.name === 'AbortError') ||
    (typeof error === 'object' && error !== null && (error as { name?: string }).name === 'AbortError')
  )
}
