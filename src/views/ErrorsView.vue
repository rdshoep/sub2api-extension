<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import ErrorFeed from '@/components/ErrorFeed.vue'
import EmptyState from '@/components/EmptyState.vue'
import PartialFailureBanner from '@/components/PartialFailureBanner.vue'
import { rpc } from '@/core/messaging/client'
import type { NormalizedError } from '@/domain/models'
import { useUiStore } from '@/stores/ui'
import { t } from '@/i18n'
import SkeletonBlock from '@/components/SkeletonBlock.vue'

const ui = useUiStore()
const items = ref<NormalizedError[]>([])
const unsupported = ref(false)
const loadError = ref('')
const failures = ref<Array<{ connectionId: string; message: string }>>([])
const loading = ref(false)

async function load() {
  loadError.value = ''
  loading.value = true
  try {
    try {
      const cached = await rpc('errors.list', { connectionId: ui.connectionId, cacheOnly: true })
      items.value = cached.items
      unsupported.value = Boolean(cached.unsupported)
      failures.value = cached.failures ?? []
    } catch {}
    const result = await rpc('errors.list', { connectionId: ui.connectionId })
    items.value = result.items
    unsupported.value = Boolean(result.unsupported)
    failures.value = result.failures ?? []
  } catch (error) {
    items.value = []
    loadError.value = error instanceof Error ? error.message : t('errors.loadFailed')
  } finally {
    loading.value = false
  }
}

async function openAdmin(item: NormalizedError) {
  const links = await rpc('links.get', { connectionId: item.connectionId })
  window.open(links.ops, '_blank')
}

onMounted(load)
watch(() => ui.connectionId, load)
defineExpose({ load })
</script>

<template>
  <div class="space-y-2">
    <PartialFailureBanner :failures="failures.map((f) => ({ connectionId: f.connectionId, message: f.message }))" />
    <p v-if="loadError" class="text-xs text-red-500">{{ loadError }}</p>
    <div v-else-if="loading && !items.length" class="space-y-2" data-testid="errors-skeleton">
      <SkeletonBlock v-for="n in 3" :key="n" class="h-14" />
    </div>
    <EmptyState v-else-if="!items.length && !unsupported" :title="t('errors.emptyTitle')" :body="t('errors.emptyBody')" />
    <ErrorFeed v-else :items="items" :unsupported="unsupported" @open="openAdmin" />
  </div>
</template>
