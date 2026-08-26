<script setup lang="ts">
import { t } from '@/i18n'
defineProps<{ at?: string; timezone?: string }>()
</script>

<template>
  <div class="text-[11px] text-accent-500">
    {{ t('updated.at', { at: at || '—' }) }}
    <span v-if="timezone"> · {{ timezone }}</span>
  </div>
</template>
