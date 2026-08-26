import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parse } from 'yaml'
import { validateAdapterSpec, validatePanelSpec } from '@/core/specs/validate'
import adapterManifest from '@/providers/sub2api/adapter-manifest.json'

describe('PanelSpec validate', () => {
  it('accepts the packed Sub2API spec', () => {
    const yaml = readFileSync(new URL('../../src/packs/sub2api.panel.yaml', import.meta.url), 'utf8')
    const spec = parse(yaml)
    const result = validatePanelSpec(spec)
    expect(result.ok, result.errors.join('\n')).toBe(true)
  })

  it('fails unknown widget and query IDs', () => {
    const result = validatePanelSpec({
      schemaVersion: 1,
      pack: { id: 'x', adapter: 'sub2api', minAdapterVersion: 1 },
      views: {
        overview: {
          widgets: [{ type: 'NotAWidget', query: 'not.a.query' }],
        },
      },
    })
    expect(result.ok).toBe(false)
    expect(result.errors.some((e) => e.includes('unknown widget'))).toBe(true)
    expect(result.errors.some((e) => e.includes('unknown query'))).toBe(true)
  })

  it('fails forbidden eval-like tokens', () => {
    const result = validatePanelSpec({
      schemaVersion: 1,
      pack: { id: 'x', adapter: 'sub2api', minAdapterVersion: 1 },
      views: {
        overview: { widgets: [{ type: 'MetricGrid', query: 'stats.today', empty: 'eval(secret)' }] },
      },
    })
    expect(result.ok).toBe(false)
  })

  it('validates adapter spec', () => {
    expect(validateAdapterSpec(adapterManifest).ok).toBe(true)
  })
})
