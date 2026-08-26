<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import UserBalanceCard from '@/components/UserBalanceCard.vue'
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue'
import EmptyState from '@/components/EmptyState.vue'
import { rpc } from '@/core/messaging/client'
import { ALL_INSTANCES_ID, type NormalizedUser, type PlatformConnection, type QuotaWindow } from '@/domain/models'
import { isWriteCapabilityAllowed } from '@/core/capabilities/state'
import { useUiStore } from '@/stores/ui'
import { balanceTone, formatMoney, sortUsersBySpendThenBalance } from '@/domain/format'
import { t } from '@/i18n'
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import AnimatedNumber from '@/components/AnimatedNumber.vue'

const ui = useUiStore()
const users = ref<NormalizedUser[]>([])
const search = ref('')
const selected = ref<NormalizedUser | null>(null)
const quotas = ref<QuotaWindow[]>([])
const connections = ref<PlatformConnection[]>([])
const dialog = ref<'balance' | 'quota' | null>(null)
const operation = ref<'set' | 'add' | 'subtract'>('set')
const amount = ref(0)
const platform = ref('anthropic')
const windowName = ref<'daily' | 'weekly' | 'monthly'>('daily')
const loadError = ref('')
const loading = ref(false)
const opening = ref(false)

const connection = computed(() => connections.value.find((c) => c.id === ui.connectionId))
const readOnly = computed(() => ui.connectionId === ALL_INSTANCES_ID || connection.value?.readOnly !== false)
const writesBlocked = computed(() => {
  const cap = dialog.value === 'quota' ? 'users.quota.reset' : 'users.balance.write'
  return !isWriteCapabilityAllowed(connection.value?.readOnly ?? true, connection.value?.capabilities[cap])
})

function statusBar(status: string): string {
  if (status === 'active') return 'bg-emerald-500'
  if (status === 'disabled') return 'bg-amber-400'
  return 'bg-red-500'
}

function balanceClass(n: number): string {
  const tone = balanceTone(n)
  if (tone === 'critical') return 'text-red-500'
  if (tone === 'warning') return 'text-amber-500'
  return 'text-primary-600'
}

async function load() {
  loadError.value = ''
  loading.value = true
  connections.value = await rpc('connections.list')
  try {
    try {
      users.value = sortUsersBySpendThenBalance(
        (await rpc('users.list', { connectionId: ui.connectionId, search: search.value, cacheOnly: true })).items,
      )
    } catch {}
    users.value = sortUsersBySpendThenBalance(
      (await rpc('users.list', { connectionId: ui.connectionId, search: search.value })).items,
    )
  } catch (error) {
    users.value = []
    loadError.value = error instanceof Error ? error.message : t('users.loadFailed')
  } finally {
    loading.value = false
  }
}

async function openUser(user: NormalizedUser) {
  if (opening.value) return
  opening.value = true
  try {
    selected.value = await rpc('users.get', { connectionId: user.connectionId, userId: user.id })
    quotas.value = await rpc('users.platformQuotas', { connectionId: user.connectionId, userId: user.id })
  } finally {
    opening.value = false
  }
}

async function confirm(reason: string) {
  if (!selected.value) return
  if (dialog.value === 'balance') {
    await rpc('users.adjustBalance', {
      connectionId: selected.value.connectionId,
      userId: selected.value.id,
      operation: operation.value,
      amount: amount.value,
      reason,
    })
  } else if (dialog.value === 'quota') {
    await rpc('users.resetQuota', {
      connectionId: selected.value.connectionId,
      userId: selected.value.id,
      platform: platform.value,
      window: windowName.value,
      reason,
    })
  }
  dialog.value = null
  await openUser(selected.value)
  await load()
}

onMounted(load)
watch(() => ui.connectionId, load)
defineExpose({ load })
</script>

<template>
  <div class="space-y-3">
    <input v-model="search" class="field" data-testid="user-search" :placeholder="t('users.search')" @change="load" />
    <p v-if="loadError" class="text-xs text-red-500">{{ loadError }}</p>
    <div v-if="loading && !users.length" class="space-y-2" data-testid="users-skeleton">
      <SkeletonBlock v-for="n in 3" :key="n" class="h-16" />
    </div>
    <EmptyState v-else-if="!users.length && !loadError" :title="t('users.emptyTitle')" :body="t('users.emptyBody')" />
    <div v-else class="space-y-2">
      <button
        v-for="u in users"
        :key="u.uid"
        type="button"
        class="card w-full text-left"
        data-testid="user-row"
        @click="openUser(u)"
      >
        <div class="flex items-stretch gap-2">
          <span class="w-1 shrink-0 rounded-full" :class="statusBar(u.status)" :title="u.status" />
          <div class="min-w-0 flex-1">
            <div class="truncate font-medium">
              {{ u.email }}
              <span v-if="u.username && u.username !== u.email" class="font-normal text-accent-500">({{ u.username }})</span>
            </div>
            <div class="text-[11px] text-accent-500">{{ t('users.lastActive', { at: u.lastActiveAt || '—' }) }}</div>
          </div>
          <div class="shrink-0 text-right">
            <div class="text-[11px] text-accent-500">{{ t('users.balance') }}</div>
            <div class="text-lg font-semibold" data-testid="user-balance" :class="balanceClass(u.balance)">
              <span class="sr-only">{{ formatMoney(u.balance) }}</span>
              <AnimatedNumber :value="formatMoney(u.balance)" :raw="u.balance" :format="formatMoney" />
            </div>
            <div class="text-[11px] text-accent-500">{{ t('users.todaySpend', { amount: formatMoney(u.todayActualCost) }) }}</div>
          </div>
        </div>
      </button>
    </div>
    <UserBalanceCard
      v-if="selected"
      :user="selected"
      :quotas="quotas"
      :read-only="readOnly || writesBlocked"
      @adjust="dialog = 'balance'"
      @reset-quota="dialog = 'quota'"
    />
    <div v-if="dialog === 'balance'" class="card space-y-2 text-xs">
      <select v-model="operation" class="field">
        <option value="set">set</option>
        <option value="add">add</option>
        <option value="subtract">subtract</option>
      </select>
      <input v-model.number="amount" class="field" type="number" data-testid="balance-amount" />
    </div>
    <div v-if="dialog === 'quota'" class="card space-y-2 text-xs">
      <select v-model="platform" class="field" data-testid="quota-platform">
        <option>anthropic</option>
        <option>openai</option>
        <option>gemini</option>
        <option>grok</option>
        <option>antigravity</option>
      </select>
      <select v-model="windowName" class="field" data-testid="quota-window">
        <option value="daily">daily</option>
        <option value="weekly">weekly</option>
        <option value="monthly">monthly</option>
      </select>
    </div>
    <ConfirmActionDialog
      :open="Boolean(dialog)"
      :title="dialog === 'balance' ? t('users.adjustTitle') : t('users.resetTitle')"
      :connection-name="connection?.name || selected?.connectionId || ''"
      :target-label="selected ? `${selected.email} (${selected.id})` : ''"
      :action-type="dialog === 'balance' ? `users.balance.${operation}` : `users.quota.reset.${platform}.${windowName}`"
      :before="dialog === 'balance' ? { balance: selected?.balance } : quotas"
      :after-expected="dialog === 'balance' ? { operation, amount } : { platform, window: windowName }"
      :read-only="readOnly || writesBlocked"
      @cancel="dialog = null"
      @confirm="confirm"
    />
  </div>
</template>
