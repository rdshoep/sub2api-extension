<script setup lang="ts">
import type { QuotaWindow } from '@/domain/models'
import { quotaDisplay, quotaWindowLabel } from '@/domain/quota'
defineProps<{ windows: QuotaWindow[] }>()
</script>

<template>
  <div class="grid grid-cols-2 gap-2">
    <div v-for="w in windows" :key="w.id" class="rounded-xl border p-2 text-xs" :style="{ borderColor: 'var(--border-subtle)' }">
      <div class="font-medium">{{ quotaWindowLabel(w) }}</div>
      <div>{{ quotaDisplay(w).primary }} · {{ quotaDisplay(w).stateLabel }}</div>
    </div>
  </div>
</template>
