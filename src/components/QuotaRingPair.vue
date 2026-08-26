<script setup lang="ts">
import type { QuotaWindow } from '@/domain/models'
import { quotaWindowLabel } from '@/domain/quota'
import QuotaRing from './QuotaRing.vue'

defineProps<{ windows: QuotaWindow[] }>()
</script>

<template>
  <div class="flex justify-around gap-1">
    <QuotaRing
      v-for="w in windows.slice(0, 2)"
      :key="w.id"
      :label="quotaWindowLabel(w)"
      :remaining-percent="w.remainingPercent"
      :used-percent="w.usedPercent"
      :state="w.state"
      :over-limit="w.overLimit"
      :remaining-seconds="w.remainingSeconds"
      :reset-at="w.resetAt"
      :size="56"
    />
  </div>
</template>
