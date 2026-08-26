import type { CapabilityState } from '@/domain/models'

export function capabilityFallback(state: CapabilityState | undefined): CapabilityState {
  return state ?? 'unsupported'
}

export function isWriteCapabilityAllowed(
  readOnly: boolean,
  capabilityState: CapabilityState | undefined,
): boolean {
  return !readOnly && capabilityFallback(capabilityState) === 'supported'
}
