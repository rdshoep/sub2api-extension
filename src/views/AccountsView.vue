<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import AccountQuotaCard from '@/components/AccountQuotaCard.vue'
import EntityGrid from '@/components/EntityGrid.vue'
import PartialFailureBanner from '@/components/PartialFailureBanner.vue'
import { rpc } from '@/core/messaging/client'
import type { NormalizedAccount } from '@/domain/models'
import { useUiStore } from '@/stores/ui'
import { usePinStore } from '@/stores/pins'
import { sortAccountsByPin } from '@/domain/platforms'
import SkeletonBlock from '@/components/SkeletonBlock.vue'

const ui = useUiStore()
const pins = usePinStore()
const items = ref<NormalizedAccount[]>([])
const visibleItems = computed(() => sortAccountsByPin(items.value, pins.uids))
const failures = ref<Array<{ connectionId: string; message: string }>>([])
const loading = ref(false)
const refreshingUid = ref('')

async function load() {
  loading.value = true
  try {
    try {
      const cached = await rpc('accounts.list', { connectionId: ui.connectionId, cacheOnly: true })
      items.value = cached.items
      failures.value = cached.failures
    } catch {}
    const result = await rpc('accounts.list', { connectionId: ui.connectionId })
    items.value = result.items
    failures.value = result.failures
  } finally {
    loading.value = false
  }
}

async function refresh(account: NormalizedAccount) {
  if (refreshingUid.value) return
  refreshingUid.value = account.uid
  try {
    await rpc('accounts.refreshQuota', { connectionId: account.connectionId, accountId: account.id, force: true })
    await load()
  } finally {
    refreshingUid.value = ''
  }
}

onMounted(load)
watch(() => ui.connectionId, load)
defineExpose({ load })
</script>

<template>
  <div class="space-y-2">
    <PartialFailureBanner :failures="failures.map((f) => ({ connectionId: f.connectionId, message: f.message }))" />
    <div v-if="loading && !items.length" class="grid grid-cols-2 gap-2" data-testid="accounts-skeleton">
      <SkeletonBlock v-for="n in 4" :key="n" class="h-32" />
    </div>
    <EntityGrid v-else>
      <AccountQuotaCard
        v-for="account in visibleItems"
        :key="account.uid"
        :account="account"
        :pinned="pins.isPinned(account.uid)"
        :refreshing="refreshingUid === account.uid"
        :refresh-disabled="Boolean(refreshingUid)"
        @pin="pins.toggle($event.uid)"
        @refresh="refresh"
      />
    </EntityGrid>
  </div>
</template>
