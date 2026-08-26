import { PACKED_WIDGETS } from '@/core/specs/validate'

export const widgetRegistry = new Set<string>(PACKED_WIDGETS)

export function isRegisteredWidget(id: string): boolean {
  return widgetRegistry.has(id)
}
