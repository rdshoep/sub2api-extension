<script setup lang="ts">
import { ref } from 'vue'
import type { NormalizedError } from '@/domain/models'
import { redactSecrets } from '@/core/security/redact'
import { t } from '@/i18n'

defineProps<{ items: NormalizedError[]; unsupported?: boolean }>()
const emit = defineEmits<{ (e: 'open', item: NormalizedError): void }>()
const expanded = ref<string | null>(null)
</script>

<template>
  <div class="card space-y-2">
    <div class="text-sm font-medium">{{ t('errors.latest') }}</div>
    <p v-if="unsupported" class="text-xs text-accent-500">{{ t('errors.unsupported') }}</p>
    <p v-else-if="!items.length" class="text-xs text-accent-500">{{ t('errors.none24h') }}</p>
    <div v-for="item in items" :key="item.uid" class="rounded-xl border p-2 text-xs" :style="{ borderColor: 'var(--border-subtle)' }">
      <div class="flex justify-between gap-2">
        <span>{{ item.platform }} · {{ item.model }} · {{ item.statusCode }}</span>
        <span class="text-accent-500">{{ item.createdAt }}</span>
      </div>
      <div>{{ item.summary }}</div>
      <button class="text-primary-600" type="button" @click="expanded = expanded === item.uid ? null : item.uid">
        {{ expanded === item.uid ? t('errors.collapse') : t('errors.expand') }}
      </button>
      <pre v-if="expanded === item.uid" class="mt-1 whitespace-pre-wrap break-all text-[11px]" data-testid="error-detail">{{ redactSecrets(item.detail || item.message) }}</pre>
      <button class="ml-2 text-primary-600" type="button" @click="emit('open', item)">{{ t('errors.openAdmin') }}</button>
    </div>
  </div>
</template>
