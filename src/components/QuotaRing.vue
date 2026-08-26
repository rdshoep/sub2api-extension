<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { QuotaState } from '@/domain/models'
import { formatResetRemaining, quotaDisplay, quotaStateLabel, resetRemainingSeconds } from '@/domain/quota'
import { t } from '@/i18n'
import { RING_RADIUS, RING_VIEWBOX, ringDash } from '@/domain/ring'

const props = withDefaults(
  defineProps<{
    remainingPercent?: number | null
    state: QuotaState
    label: string
    overLimit?: boolean
    size?: number
    usedPercent?: number | null
    remainingSeconds?: number | null
    resetAt?: string | null
  }>(),
  { size: 72 },
)

const now = ref(Date.now())
let tick: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  tick = setInterval(() => {
    now.value = Date.now()
  }, 30_000)
})
onUnmounted(() => {
  if (tick) clearInterval(tick)
})

const resetIn = computed(() =>
  formatResetRemaining(
    resetRemainingSeconds({
      remainingSeconds: props.remainingSeconds,
      resetAt: props.resetAt,
      now: now.value,
    }),
  ),
)

const display = computed(() =>
  quotaDisplay({
    id: props.label,
    label: props.label,
    remainingPercent: props.remainingPercent ?? undefined,
    usedPercent: props.usedPercent ?? undefined,
    state: props.state,
    overLimit: props.overLimit,
  }),
)

const muted = computed(() => props.state === 'stale' || props.state === 'unknown')

const color = computed(() => {
  if (muted.value) return 'var(--ring-unknown)'
  switch (props.state) {
    case 'healthy':
      return 'var(--ring-healthy)'
    case 'warning':
      return 'var(--ring-warning)'
    case 'critical':
    case 'exhausted':
    case 'over-limit':
      return 'var(--ring-critical)'
    default:
      return 'var(--ring-unknown)'
  }
})

const stroke = computed(() => ringDash(props.remainingPercent, props.state))
const aria = computed(() => {
  const reset = resetIn.value ? `, ${t('quota.resetIn', { time: resetIn.value })}` : ''
  return `${props.label} remaining ${display.value.primary}, ${quotaStateLabel(props.state, props.overLimit)}${reset}`
})
</script>

<template>
  <div
    class="inline-flex flex-col items-center gap-0.5"
    :style="muted ? { color } : undefined"
    :aria-label="aria"
    role="img"
    :data-stale="state === 'stale' ? '1' : '0'"
  >
    <svg :width="size" :height="size" :viewBox="`0 0 ${RING_VIEWBOX} ${RING_VIEWBOX}`">
      <circle :cx="RING_VIEWBOX / 2" :cy="RING_VIEWBOX / 2" :r="RING_RADIUS" fill="none" stroke="var(--border-subtle)" stroke-width="6" />
      <circle
        :cx="RING_VIEWBOX / 2"
        :cy="RING_VIEWBOX / 2"
        :r="RING_RADIUS"
        fill="none"
        :stroke="color"
        stroke-width="6"
        :stroke-linecap="stroke.full ? 'butt' : 'round'"
        :stroke-dasharray="stroke.full ? undefined : `${stroke.dash} ${stroke.gap}`"
        :transform="`rotate(-90 ${RING_VIEWBOX / 2} ${RING_VIEWBOX / 2})`"
        data-testid="quota-ring-arc"
        :data-full="stroke.full ? '1' : '0'"
        :data-dash="String(stroke.dash)"
        :data-circ="String(stroke.circ)"
      />
      <text :x="RING_VIEWBOX / 2" y="32" text-anchor="middle" font-size="13" font-weight="700" fill="currentColor">
        {{ display.primary }}
      </text>
      <text
        :x="RING_VIEWBOX / 2"
        y="48"
        text-anchor="middle"
        font-size="11"
        font-weight="600"
        fill="currentColor"
        opacity="0.78"
        data-testid="quota-window-label"
      >
        {{ label }}
      </text>
    </svg>
    <div class="text-center text-[10px] leading-tight">
      <div v-if="resetIn" class="tabular-nums text-accent-500" data-testid="quota-reset-in">{{ resetIn }}</div>
      <div :style="{ color }">{{ display.stateLabel }}</div>
    </div>
  </div>
</template>
