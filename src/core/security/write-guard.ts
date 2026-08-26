import type { PlatformConnection, WriteConfirmation } from '@/domain/models'
import { capabilityFallback } from '@/core/capabilities/state'

const inFlight = new Set<string>()

export function assertWritesAllowed(connection: PlatformConnection, capability: string): void {
  if (connection.readOnly) {
    throw Object.assign(new Error('This connection is read-only. Enable Allow Writes to continue.'), {
      code: 'READ_ONLY',
    })
  }
  const state = capabilityFallback(connection.capabilities[capability])
  if (state === 'unsupported') {
    throw Object.assign(new Error('This action is unsupported on this instance.'), {
      code: 'UNSUPPORTED',
    })
  }
}

export function buildConfirmation(input: WriteConfirmation): WriteConfirmation {
  if (!input.reason?.trim()) {
    throw Object.assign(new Error('Reason is required'), { code: 'REASON_REQUIRED' })
  }
  if (input.targetId === undefined || input.targetId === '') {
    throw Object.assign(new Error('Target identity is required'), { code: 'TARGET_REQUIRED' })
  }
  return { ...input, reason: input.reason.trim() }
}

export async function withDoubleSubmitGuard<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (inFlight.has(key)) {
    throw Object.assign(new Error('This action is already in progress'), { code: 'IN_FLIGHT' })
  }
  inFlight.add(key)
  try {
    return await fn()
  } finally {
    inFlight.delete(key)
  }
}

export function clearWriteGuards(): void {
  inFlight.clear()
}

export function readAfterWriteChanged(before: unknown, after: unknown): boolean {
  return JSON.stringify(before) !== JSON.stringify(after)
}
