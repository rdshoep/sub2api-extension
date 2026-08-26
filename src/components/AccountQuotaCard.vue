<script setup lang="ts">
import type { NormalizedAccount } from '@/domain/models'
import QuotaRingPair from './QuotaRingPair.vue'
import PlatformLogo from './PlatformLogo.vue'
import { platformMeta } from '@/domain/platforms'
import { t } from '@/i18n'
import BusySpinner from './BusySpinner.vue'

defineProps<{
  account: NormalizedAccount
  pinned?: boolean
  refreshing?: boolean
  refreshDisabled?: boolean
}>()
const emit = defineEmits<{
  (e: 'pin', account: NormalizedAccount): void
  (e: 'refresh', account: NormalizedAccount): void
}>()
</script>

<template>
  <div class="card min-w-0 space-y-1.5 p-2 transition-opacity" data-testid="account-card" :data-pinned="pinned ? '1' : '0'" :class="refreshing ? 'opacity-60' : ''">
    <div class="flex items-start justify-between gap-1">
      <div class="flex min-w-0 items-center gap-1.5">
        <PlatformLogo :platform="account.upstreamPlatform" :size="20" />
        <div class="min-w-0">
          <div class="truncate text-xs font-medium" data-testid="account-name">{{ account.name }}</div>
          <div class="truncate text-[10px] text-accent-500">
            {{ platformMeta(account.upstreamPlatform).label }}
            <span v-if="account.status !== 'active'"> · {{ account.status }}</span>
          </div>
        </div>
      </div>
      <div class="flex flex-col items-end">
        <button
          class="btn btn-ghost px-1 py-0.5 text-xs"
          type="button"
          data-testid="pin-account"
          :aria-pressed="pinned"
          :title="pinned ? t('accounts.unpin') : t('accounts.pin')"
          @click="emit('pin', account)"
        >
          {{ pinned ? '★' : '☆' }}
        </button>
        <button
          class="btn btn-ghost px-1 py-0.5 text-[11px]"
          type="button"
          data-testid="refresh-account"
          :title="t('accounts.refreshQuota')"
          :disabled="refreshing || refreshDisabled"
          @click="emit('refresh', account)"
        >
          <BusySpinner v-if="refreshing" />
          <span v-else>↻</span>
        </button>
      </div>
    </div>
    <QuotaRingPair :windows="account.quotaWindows" />
  </div>
</template>
