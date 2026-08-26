export interface ApiEnvelope<T = unknown> {
  code: number
  message: string
  data: T
  reason?: unknown
  metadata?: unknown
}

export class EnvelopeError extends Error {
  readonly code: number | string
  readonly reason?: unknown
  readonly metadata?: unknown
  readonly status?: number

  constructor(message: string, code: number | string, extra?: { reason?: unknown; metadata?: unknown; status?: number }) {
    super(message)
    this.name = 'EnvelopeError'
    this.code = code
    this.reason = extra?.reason
    this.metadata = extra?.metadata
    this.status = extra?.status
  }
}

export function isEnvelope(value: unknown): value is ApiEnvelope {
  return Boolean(value && typeof value === 'object' && 'code' in (value as object))
}

export function unwrapEnvelope<T>(body: unknown, httpStatus = 200): T {
  if (!isEnvelope(body)) {
    return body as T
  }
  if (body.code === 0) {
    return body.data as T
  }
  throw new EnvelopeError(body.message || 'Unknown error', body.code, {
    reason: body.reason,
    metadata: body.metadata,
    status: httpStatus,
  })
}
