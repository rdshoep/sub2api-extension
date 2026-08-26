import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv'
import panelSchema from '../../../schemas/panel-spec.schema.json'
import adapterSchema from '../../../schemas/adapter-spec.schema.json'

export const PACKED_WIDGETS = [
  'MetricGrid',
  'MetricCard',
  'ModelUsageTable',
  'ErrorFeed',
  'EntityGrid',
  'EntityTable',
  'AccountQuotaCard',
  'QuotaRing',
  'QuotaRingPair',
  'QuotaWindowGrid',
  'TrendChart',
  'UserBalanceCard',
  'LastUpdated',
  'EmptyState',
  'PartialFailureBanner',
] as const

export const PACKED_QUERIES = [
  'stats.today',
  'stats.models.today',
  'errors.latest',
  'accounts.list',
  'users.list',
] as const

export const PACKED_ACTIONS = ['user.balance.adjust', 'user.quota.reset', 'accounts.quota.reset'] as const

export const PACKED_FORMATTERS = ['number', 'percent', 'usd', 'datetime', 'quotaRemaining'] as const

const FORBIDDEN = ['eval', 'new Function', 'Function(', 'import(', 'SecretVault']

export interface PanelSpec {
  schemaVersion: number
  pack: { id: string; adapter: string; minAdapterVersion: number }
  theme?: { preset?: string; tokens?: Record<string, string> }
  views: Record<string, { scopes?: string[]; widgets: Array<Record<string, unknown>> }>
  actions?: Record<string, Record<string, unknown>>
  queries?: Record<string, unknown>
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
}

function collect(errors: ErrorObject[] | null | undefined): string[] {
  return (errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message}`)
}

function scanForbidden(value: unknown, errors: string[], path = '$'): void {
  if (typeof value === 'string') {
    for (const token of FORBIDDEN) {
      if (value.includes(token)) errors.push(`${path} contains forbidden token ${token}`)
    }
    if (/\bexpr\b|\bscript\b|\beval\b/.test(value) && /function|=>/.test(value)) {
      errors.push(`${path} contains a script expression`)
    }
  } else if (Array.isArray(value)) {
    value.forEach((v, i) => scanForbidden(v, errors, `${path}[${i}]`))
  } else if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) scanForbidden(v, errors, `${path}.${k}`)
  }
}

function collectRefs(spec: PanelSpec): { widgets: string[]; queries: string[]; actions: string[]; formatters: string[] } {
  const widgets: string[] = []
  const queries: string[] = []
  const actions = Object.keys(spec.actions ?? {})
  const formatters: string[] = []
  for (const view of Object.values(spec.views ?? {})) {
    for (const widget of view.widgets ?? []) {
      if (typeof widget.type === 'string') widgets.push(widget.type)
      if (typeof widget.query === 'string') queries.push(widget.query)
      if (typeof widget.formatter === 'string') formatters.push(widget.formatter)
    }
  }
  return { widgets, queries, actions, formatters }
}

let panelValidate: ValidateFunction | undefined
let adapterValidate: ValidateFunction | undefined

function getAjv(): Ajv {
  return new Ajv({ allErrors: true, strict: false })
}

export function validatePanelSpec(
  spec: unknown,
  registries?: {
    widgets?: readonly string[]
    queries?: readonly string[]
    actions?: readonly string[]
    formatters?: readonly string[]
  },
): ValidationResult {
  panelValidate ??= getAjv().compile(panelSchema)
  const errors: string[] = []
  if (!panelValidate(spec)) errors.push(...collect(panelValidate.errors))
  scanForbidden(spec, errors)
  if (spec && typeof spec === 'object' && 'views' in (spec as object)) {
    const packed = collectRefs(spec as PanelSpec)
    const widgets = registries?.widgets ?? PACKED_WIDGETS
    const queries = registries?.queries ?? PACKED_QUERIES
    const actions = registries?.actions ?? PACKED_ACTIONS
    const formatters = registries?.formatters ?? PACKED_FORMATTERS
    for (const id of packed.widgets) {
      if (!widgets.includes(id)) errors.push(`unknown widget id: ${id}`)
    }
    for (const id of packed.queries) {
      if (!queries.includes(id)) errors.push(`unknown query id: ${id}`)
    }
    for (const id of packed.actions) {
      if (!actions.includes(id)) errors.push(`unknown action id: ${id}`)
    }
    for (const id of packed.formatters) {
      if (!formatters.includes(id)) errors.push(`unknown formatter id: ${id}`)
    }
  }
  return { ok: errors.length === 0, errors }
}

export function validateAdapterSpec(spec: unknown): ValidationResult {
  adapterValidate ??= getAjv().compile(adapterSchema)
  const errors: string[] = []
  if (!adapterValidate(spec)) errors.push(...collect(adapterValidate.errors))
  return { ok: errors.length === 0, errors }
}
