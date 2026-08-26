<script setup lang="ts">
import type { ModelStatRow } from '@/domain/models'
import { formatCompactCount, formatMoney } from '@/domain/format'
import { t } from '@/i18n'
const props = defineProps<{ rows: ModelStatRow[] }>()
function maxTokens() {
  return Math.max(1, ...props.rows.map((r) => r.tokens))
}
</script>

<template>
  <div class="card space-y-2">
    <div class="text-sm font-medium">{{ t('models.title') }}</div>
    <table class="w-full text-left text-xs">
      <thead>
        <tr class="text-accent-500">
          <th>{{ t('models.model') }}</th>
          <th>{{ t('models.requests') }}</th>
          <th>{{ t('models.tokens') }}</th>
          <th>{{ t('models.cost') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.model">
          <td class="py-1">
            <div>{{ row.model }}</div>
            <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-accent-100 dark:bg-dark-700">
              <div class="h-full bg-primary-500" :style="{ width: `${(row.tokens / maxTokens()) * 100}%` }" />
            </div>
          </td>
          <td>{{ row.requests }}</td>
          <td :title="String(row.tokens)">{{ formatCompactCount(row.tokens) }}</td>
          <td>{{ formatMoney(row.actualCost, 4) }}</td>
        </tr>
      </tbody>
    </table>
    <p v-if="!rows.length" class="text-xs text-accent-500">{{ t('models.empty') }}</p>
  </div>
</template>
