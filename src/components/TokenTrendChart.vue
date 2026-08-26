<script setup lang="ts">
import { computed, ref } from 'vue'
import type { TrendPoint, UserTrendSeries } from '@/domain/models'
import { formatCompactCount, formatTrendAt } from '@/domain/format'
import { locale, t } from '@/i18n'

const props = withDefaults(defineProps<{ points: TrendPoint[]; series?: UserTrendSeries[] }>(), { series: () => [] })

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16', '#06b6d4', '#a855f7']

const hoverIndex = ref<number | null>(null)

const geometry = computed(() => {
  void locale.value
  const series = (props.series ?? []).slice(0, 12)
  const fallback = props.points?.length ? [{ uid: 'total', label: t('trend.total'), points: props.points }] : []
  const used = series.length ? series : fallback
  if (!used.length) return null
  const w = 320
  const h = 96
  const pad = 8
  const times = [...new Set(used.flatMap((s) => s.points.map((p) => p.at)))].sort()
  if (!times.length) return null
  const valueAt = (s: UserTrendSeries, at: string) => {
    const point = s.points.find((p) => p.at === at)
    return { tokens: point?.tokens ?? 0, requests: point?.requests ?? 0 }
  }
  const max = Math.max(1, ...used.flatMap((s) => times.map((at) => valueAt(s, at).tokens)))
  const xAt = (at: string) => pad + (times.length === 1 ? 0 : (times.indexOf(at) / (times.length - 1)) * (w - pad * 2))
  const yAt = (tokens: number) => h - pad - (tokens / max) * (h - pad * 2)
  const lines = used.map((s, i) => ({
    uid: s.uid,
    label: s.label,
    color: COLORS[i % COLORS.length],
    points: times.map((at) => `${xAt(at)},${yAt(valueAt(s, at).tokens)}`).join(' '),
  }))
  const columns = times.map((at) => ({
    at,
    x: xAt(at),
    values: used.map((s, i) => {
      const { tokens, requests } = valueAt(s, at)
      return {
        uid: s.uid,
        label: s.label,
        color: COLORS[i % COLORS.length],
        tokens,
        requests,
        y: yAt(tokens),
      }
    }),
  }))
  return { w, h, lines, max, columns }
})

const tooltip = computed(() => {
  const g = geometry.value
  if (!g || hoverIndex.value == null) return null
  return g.columns[hoverIndex.value] ?? null
})

function clientXToViewBox(svg: SVGSVGElement, clientX: number, viewBoxWidth: number): number | null {
  const ctm = typeof svg.getScreenCTM === 'function' ? svg.getScreenCTM() : null
  if (ctm && typeof svg.createSVGPoint === 'function') {
    const point = svg.createSVGPoint()
    if (typeof point.matrixTransform === 'function' && typeof ctm.inverse === 'function') {
      point.x = clientX
      point.y = 0
      return point.matrixTransform(ctm.inverse()).x
    }
  }
  const rect = svg.getBoundingClientRect()
  if (!rect.width) return null
  return ((clientX - rect.left) / rect.width) * viewBoxWidth
}

function onMove(event: MouseEvent) {
  const g = geometry.value
  if (!g) return
  const svg = event.currentTarget as SVGSVGElement
  const x = clientXToViewBox(svg, event.clientX, g.w)
  if (x == null) return
  let best = 0
  let dist = Number.POSITIVE_INFINITY
  g.columns.forEach((column, index) => {
    const d = Math.abs(column.x - x)
    if (d < dist) {
      dist = d
      best = index
    }
  })
  hoverIndex.value = best
}

function onLeave() {
  hoverIndex.value = null
}
</script>

<template>
  <div class="card relative space-y-1 p-2" data-testid="token-trend">
    <div class="flex items-center justify-between text-xs">
      <span class="font-medium">{{ t('trend.title') }}</span>
      <span v-if="geometry" class="text-[11px] text-accent-500">{{ t('trend.peak', { value: formatCompactCount(geometry.max) }) }}</span>
    </div>
    <div class="relative">
      <svg
        v-if="geometry"
        :viewBox="`0 0 ${geometry.w} ${geometry.h}`"
        preserveAspectRatio="none"
        class="block h-28 w-full cursor-crosshair"
        data-testid="token-trend-svg"
        @mousemove="onMove"
        @mouseleave="onLeave"
      >
        <polyline
          v-for="line in geometry.lines"
          :key="line.uid"
          :points="line.points"
          fill="none"
          :stroke="line.color"
          stroke-width="2"
          stroke-linejoin="round"
          stroke-linecap="round"
        />
        <g v-if="tooltip" pointer-events="none">
          <line
            :x1="tooltip.x"
            :x2="tooltip.x"
            y1="0"
            :y2="geometry.h"
            stroke="currentColor"
            stroke-opacity="0.35"
            stroke-dasharray="3 3"
          />
          <circle
            v-for="item in tooltip.values"
            :key="item.uid"
            :cx="tooltip.x"
            :cy="item.y"
            r="3"
            :fill="item.color"
            stroke="#fff"
            stroke-width="1"
          />
        </g>
      </svg>
      <div
        v-if="geometry && tooltip"
        class="pointer-events-none absolute top-1 z-10 min-w-[7.5rem] max-w-[11rem] rounded-lg border bg-white/95 p-1.5 text-[10px] shadow-sm dark:bg-dark-900/95"
        :style="{
          left: `${(tooltip.x / geometry.w) * 100}%`,
          transform: tooltip.x > geometry.w * 0.58 ? 'translateX(calc(-100% - 8px))' : 'translateX(8px)',
          borderColor: 'var(--border-subtle)',
        }"
        data-testid="trend-tooltip"
      >
        <div class="mb-0.5 font-medium">{{ formatTrendAt(tooltip.at) }}</div>
        <div v-for="item in tooltip.values" :key="item.uid" class="flex items-center justify-between gap-2">
          <span class="inline-flex min-w-0 items-center gap-1 truncate">
            <span class="inline-block h-1.5 w-1.5 shrink-0 rounded-full" :style="{ background: item.color }" />
            {{ item.label }}
          </span>
          <span class="shrink-0 tabular-nums">
            {{ formatCompactCount(item.tokens) }}
            <span v-if="item.requests" class="text-accent-500"> · {{ item.requests }}</span>
          </span>
        </div>
      </div>
    </div>
    <div v-if="geometry?.lines.length" class="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px]">
      <span v-for="line in geometry.lines" :key="line.uid" class="inline-flex items-center gap-1">
        <span class="inline-block h-1.5 w-1.5 rounded-full" :style="{ background: line.color }" />
        {{ line.label }}
      </span>
    </div>
    <p v-else class="text-[11px] text-accent-500">{{ t('trend.empty') }}</p>
  </div>
</template>
