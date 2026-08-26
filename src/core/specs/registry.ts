import { parse as parseYaml } from 'yaml'
import { validatePanelSpec, type PanelSpec } from './validate'
import panelYaml from '../../packs/sub2api.panel.yaml?raw'

export class PanelSpecRegistry {
  private spec: PanelSpec | null = null

  loadPacked(): PanelSpec {
    if (this.spec) return this.spec
    const parsed = parseYaml(panelYaml) as PanelSpec
    const result = validatePanelSpec(parsed)
    if (!result.ok) {
      throw new Error(`Packed PanelSpec is invalid: ${result.errors.join('; ')}`)
    }
    this.spec = parsed
    return parsed
  }

  getAction(id: string) {
    const spec = this.loadPacked()
    const action = spec.actions?.[id]
    if (!action) throw new Error(`unknown action id: ${id}`)
    return action
  }
}

export const panelSpecRegistry = new PanelSpecRegistry()
