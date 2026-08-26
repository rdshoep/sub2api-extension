<script setup lang="ts">
import type { PartialFailure } from '@/domain/models'
import { t } from '@/i18n'
defineProps<{ failures: PartialFailure[] }>()
</script>

<template>
  <div v-if="failures.length" class="rounded-xl border border-amber-400/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100" data-testid="partial-failure">
    {{ t('partial.banner') }}
    <span v-for="f in failures" :key="f.connectionId" class="mr-2">
      {{ f.connectionName || f.connectionId }} — {{ f.message }}
    </span>
  </div>
</template>
