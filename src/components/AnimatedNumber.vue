<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import { easeOutCubic, formatNumericDisplay, splitNumericDisplay } from '@/domain/animate'

const props = defineProps<{
  value: string | number
  raw?: number
  format?: (n: number) => string
}>()

function isIntegerText(text: string): boolean {
  return /^-?\d+$/.test(text.trim())
}

const shown = ref(String(props.value))
const flipDigits = ref<string[] | null>(isIntegerText(String(props.value)) ? String(props.value).trim().split('') : null)
let fromRaw = typeof props.raw === 'number' ? props.raw : splitNumericDisplay(String(props.value))?.number ?? 0
let frame = 0

function stop() {
  if (frame) cancelAnimationFrame(frame)
  frame = 0
}

function applyFinal(next: string, raw: number) {
  shown.value = next
  flipDigits.value = isIntegerText(next) ? next.trim().split('') : null
  fromRaw = raw
}

function animateTo(nextDisplay: string, toRaw: number) {
  const start = fromRaw
  const delta = toRaw - start
  if (!Number.isFinite(toRaw) || delta === 0) {
    applyFinal(nextDisplay, toRaw)
    return
  }
  if (isIntegerText(shown.value) && isIntegerText(nextDisplay)) {
    applyFinal(nextDisplay, toRaw)
    return
  }
  const parts = splitNumericDisplay(nextDisplay)
  const started = performance.now()
  const duration = 700
  const useRawFormat = typeof props.format === 'function'
  const tick = (now: number) => {
    const t = Math.min(1, (now - started) / duration)
    const current = start + delta * easeOutCubic(t)
    if (useRawFormat) shown.value = props.format!(current)
    else if (parts) shown.value = formatNumericDisplay(parts, current)
    else shown.value = nextDisplay
    flipDigits.value = null
    if (t < 1) {
      frame = requestAnimationFrame(tick)
    } else {
      applyFinal(nextDisplay, toRaw)
    }
  }
  stop()
  frame = requestAnimationFrame(tick)
}

watch(
  () => [props.value, props.raw] as const,
  ([value, raw]) => {
    const next = String(value)
    const toRaw = typeof raw === 'number' ? raw : splitNumericDisplay(next)?.number
    if (toRaw == null || !Number.isFinite(toRaw)) {
      applyFinal(next, fromRaw)
      return
    }
    animateTo(next, toRaw)
  },
)

onUnmounted(stop)
</script>

<template>
  <span class="inline-flex items-baseline justify-center tabular-nums">
    <template v-if="flipDigits">
      <span
        v-for="(digit, index) in flipDigits"
        :key="`${index}-${flipDigits.length}`"
        class="digit-window"
      >
        <span class="digit-reel" :style="{ transform: `translateY(-${Number(digit) * 10}%)` }">
          <span v-for="n in 10" :key="n" class="digit-cell">{{ n - 1 }}</span>
        </span>
      </span>
    </template>
    <span v-else>{{ shown }}</span>
  </span>
</template>
