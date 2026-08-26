import { computed, ref } from 'vue'

const pending = ref(0)

export const pendingRequests = computed(() => pending.value)
export const isBusy = computed(() => pending.value > 0)

export function beginRequest(): void {
  pending.value += 1
}

export function endRequest(): void {
  pending.value = Math.max(0, pending.value - 1)
}

export function shouldTrackPayload(payload: unknown): boolean {
  return !(payload && typeof payload === 'object' && 'cacheOnly' in payload && (payload as { cacheOnly?: boolean }).cacheOnly)
}
