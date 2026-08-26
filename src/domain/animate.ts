export interface NumericDisplay {
  prefix: string
  number: number
  suffix: string
  decimals: number
}

const NUMERIC = /^(-?)(\D*?)(\d+(?:\.\d+)?)(.*)$/

export function splitNumericDisplay(text: string): NumericDisplay | null {
  const match = String(text).trim().match(NUMERIC)
  if (!match) return null
  const [, sign, prefix, body, suffix] = match
  const number = Number(`${sign}${body}`)
  if (!Number.isFinite(number)) return null
  const dot = body.indexOf('.')
  return {
    prefix,
    number,
    suffix,
    decimals: dot === -1 ? 0 : body.length - dot - 1,
  }
}

export function formatNumericDisplay(parts: NumericDisplay, value: number): string {
  const abs = Math.abs(value)
  const body = parts.decimals > 0 ? abs.toFixed(parts.decimals) : String(Math.round(abs))
  const sign = value < 0 ? '-' : ''
  return `${sign}${parts.prefix}${body}${parts.suffix}`
}

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3
}
