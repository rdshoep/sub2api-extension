<script setup lang="ts">
import type { ConnectionStatus } from '@/domain/models'
import { t, type MessageKey } from '@/i18n'
defineProps<{ status?: ConnectionStatus }>()
const keys: Record<string, MessageKey> = {
  online: 'status.online',
  offline: 'status.offline',
  unauthorized: 'status.unauthorized',
  degraded: 'status.degraded',
}
</script>

<template>
  <span class="rounded-full px-2 py-0.5 text-[11px]" :data-status="status">{{ t(keys[status || 'offline'] || 'status.offline') }}</span>
</template>
