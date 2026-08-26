<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import MetricGrid from '@/components/MetricGrid.vue'
import ModelUsageTable from '@/components/ModelUsageTable.vue'
import ErrorFeed from '@/components/ErrorFeed.vue'
import PartialFailureBanner from '@/components/PartialFailureBanner.vue'
import LastUpdated from '@/components/LastUpdated.vue'
import TokenTrendChart from '@/components/TokenTrendChart.vue'
import { rpc } from '@/core/messaging/client'
import type { OverviewResult } from '@/core/messaging/protocol'
import { useUiStore } from '@/stores/ui'
import type { NormalizedError } from '@/domain/models'
import { OVERVIEW_RANGES, type OverviewRange } from '@/domain/range'
import { formatCompactCount, formatMoney } from '@/domain/format'
import { t } from '@/i18n'
import SkeletonBlock from '@/components/SkeletonBlock.vue'

const ui = useUiStore()
const data = ref<OverviewResult | null>(null)
const errors = ref<NormalizedError[]>([])
const loading = ref(false)
const AUTO_S = 30
const remainSec = ref(AUTO_S)
let tickTimer: ReturnType<typeof setInterval> | undefined

async function load(opts?: { background?: boolean }) {
  const background = Boolean(opts?.background && data.value)
  if (!background) loading.value = true
  const payload = { connectionId: ui.connectionId, range: ui.overviewRange }
  try {
    if (!data.value) {
      try {
        data.value = await rpc('overview.get', { ...payload, cacheOnly: true })
      } catch {}
    }
    data.value = await rpc('overview.get', payload)
    try {
      const cachedErr = await rpc('errors.list', { connectionId: ui.connectionId, cacheOnly: true })
      errors.value = cachedErr.items.slice(0, 10)
    } catch {}
    const err = await rpc('errors.list', { connectionId: ui.connectionId })
    errors.value = err.items.slice(0, 10)
  } catch (error) {
    ui.lastError = error instanceof Error ? error.message : 'Failed'
  } finally {
    if (!background) loading.value = false
  }
}

function stopAutoRefresh() {
  if (tickTimer) clearInterval(tickTimer)
  tickTimer = undefined
}

function armAutoRefresh() {
  stopAutoRefresh()
  remainSec.value = AUTO_S
  if (!ui.overviewAutoRefresh) return
  tickTimer = setInterval(() => {
    remainSec.value -= 1
    if (remainSec.value > 0) return
    remainSec.value = AUTO_S
    if (!loading.value) void load({ background: true })
  }, 1000)
}

onMounted(() => {
  void load()
  armAutoRefresh()
})
onUnmounted(stopAutoRefresh)
watch(() => ui.connectionId, () => void load())
watch(() => ui.overviewRange, () => void load())
watch(() => ui.overviewAutoRefresh, armAutoRefresh)

defineExpose({ load })
</script>

<template>
  <div class="space-y-2">
    <PartialFailureBanner :failures="data?.aggregated.failures ?? []" />
    <div class="flex items-center justify-between gap-1">
      <div class="flex min-w-0 flex-wrap gap-1" data-testid="overview-range">
        <button
          v-for="item in OVERVIEW_RANGES"
          :key="item.id"
          type="button"
          class="rounded-xl px-3 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          :class="ui.overviewRange === item.id ? 'bg-primary-500 text-white' : 'bg-accent-100 dark:bg-dark-800'"
          :data-testid="`range-${item.id}`"
          :disabled="loading"
          @click="ui.setOverviewRange(item.id as OverviewRange)"
        >
          {{ t(item.labelKey) }}
        </button>
      </div>
      <button
        class="shrink-0 rounded-xl px-2 py-1 text-xs tabular-nums"
        type="button"
        data-testid="overview-auto-refresh"
        :aria-pressed="ui.overviewAutoRefresh"
        :class="ui.overviewAutoRefresh ? 'bg-primary-500 text-white' : 'bg-accent-100 dark:bg-dark-800'"
        @click="ui.setOverviewAutoRefresh(!ui.overviewAutoRefresh)"
      >
        {{ t('overview.autoRefresh', { seconds: ui.overviewAutoRefresh ? remainSec : AUTO_S }) }}
      </button>
    </div>
    <div v-if="loading && !data" class="space-y-2" data-testid="overview-skeleton">
      <div class="grid grid-cols-4 gap-1.5">
        <SkeletonBlock v-for="n in 11" :key="n" class="h-[52px]" />
      </div>
      <SkeletonBlock class="h-28" />
      <SkeletonBlock class="h-24" />
    </div>
    <div v-else-if="data" class="space-y-2" :class="loading ? 'opacity-80' : 'panel-fade'">
    <p class="text-[11px] text-accent-500">
      {{
        t('overview.critical', {
          count: data?.quota.criticalCount ?? 0,
          remaining: data?.quota.lowestRemaining == null ? '—' : `${Math.round(data.quota.lowestRemaining)}%`,
          reset: data?.quota.nearestResetAt || '—',
        })
      }}
    </p>
    <MetricGrid
      :items="[
        { id: 'requests', label: t('metrics.requests'), value: data.aggregated.requests, raw: data.aggregated.requests },
        { id: 'tokens', label: t('metrics.tokens'), value: formatCompactCount(data.aggregated.tokens), hint: String(data.aggregated.tokens), raw: data.aggregated.tokens, format: formatCompactCount },
        { id: 'actualCost', label: t('metrics.actualCost'), value: formatMoney(data.aggregated.actualCost), raw: data.aggregated.actualCost, format: formatMoney },
        { id: 'accountCost', label: t('metrics.accountCost'), value: formatMoney(data.aggregated.accountCost), raw: data.aggregated.accountCost, format: formatMoney },
        { id: 'errors', label: t('metrics.errors'), value: data.aggregated.errorCount, raw: data.aggregated.errorCount },
        { id: 'errorRate', label: t('metrics.errorRate'), value: `${(data.aggregated.errorRate * 100).toFixed(2)}%`, raw: data.aggregated.errorRate * 100 },
        { id: 'rpm', label: t('metrics.rpm'), value: data.aggregated.rpm, raw: data.aggregated.rpm },
        { id: 'tpm', label: t('metrics.tpm'), value: formatCompactCount(data.aggregated.tpm), raw: data.aggregated.tpm, format: formatCompactCount },
        { id: 'normalAccounts', label: t('metrics.normalAccounts'), value: data.aggregated.normalAccounts, raw: data.aggregated.normalAccounts },
        { id: 'rateLimitedAccounts', label: t('metrics.rateLimitedAccounts'), value: data.aggregated.rateLimitedAccounts, raw: data.aggregated.rateLimitedAccounts },
        { id: 'errorAccounts', label: t('metrics.errorAccounts'), value: data.aggregated.errorAccounts, raw: data.aggregated.errorAccounts },
      ]"
    />
    <TokenTrendChart :points="data?.aggregated.trend ?? []" :series="data?.aggregated.userSeries ?? []" />
    <ModelUsageTable :rows="data?.aggregated.models ?? []" />
    <ErrorFeed :items="errors" />
    <div class="space-y-0.5 pt-1 text-[11px] text-accent-500">
      <LastUpdated :at="data?.aggregated.snapshots[0]?.fetchedAt" :timezone="data?.aggregated.timezone" />
      <p>
        {{
          t('overview.timezone', {
            range: t(OVERVIEW_RANGES.find((r) => r.id === ui.overviewRange)?.labelKey || 'range.today'),
            date: data?.aggregated.date || '—',
            timezone: data?.aggregated.timezone || '—',
          })
        }}
      </p>
    </div>
    </div>
  </div>
</template>
