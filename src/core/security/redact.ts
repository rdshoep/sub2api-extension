const PATTERNS: Array<{ re: RegExp; replacement: string }> = [
  { re: /Bearer\s+[A-Za-z0-9._\-+=/]+/gi, replacement: 'Bearer [REDACTED]' },
  { re: /Authorization\s*[:=]\s*[^\s,;]+/gi, replacement: 'Authorization: [REDACTED]' },
  { re: /Cookie\s*[:=]\s*[^\n;]+/gi, replacement: 'Cookie: [REDACTED]' },
  { re: /((?:x-api-key|admin-api-key|api[_-]?key))\s*[:=]\s*[^\s,;]+/gi, replacement: '$1: [REDACTED]' },
  { re: /"(access_token|refresh_token|id_token|api_key|password|secret)"\s*:\s*"[^"]*"/gi, replacement: '"$1":"[REDACTED]"' },
]

export function redactSecrets(input: unknown): string {
  let text = typeof input === 'string' ? input : input == null ? '' : JSON.stringify(input)
  for (const { re, replacement } of PATTERNS) {
    text = text.replace(new RegExp(re.source, re.flags), replacement)
  }
  return text
}

export function maskHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase()
    if (lower === 'authorization' || lower === 'x-api-key' || lower === 'cookie') {
      out[key] = '[REDACTED]'
    } else {
      out[key] = redactSecrets(value)
    }
  }
  return out
}

export function safeLog(_level: 'info' | 'warn' | 'error', _message: string, extra?: unknown): void {
  if (import.meta.env?.DEV && import.meta.env?.MODE === 'development') {
    const redacted = extra === undefined ? '' : redactSecrets(extra)
    console[_level](_message, redacted)
  }
}
