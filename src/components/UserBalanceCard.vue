<script setup lang="ts">
import type { NormalizedUser, QuotaWindow } from '@/domain/models'
import { formatMoney } from '@/domain/format'
import { t } from '@/i18n'
import QuotaWindowGrid from './QuotaWindowGrid.vue'

defineProps<{
  user: NormalizedUser
  quotas?: QuotaWindow[]
  readOnly?: boolean
}>()
const emit = defineEmits<{
  (e: 'adjust'): void
  (e: 'resetQuota'): void
}>()
</script>

<template>
  <div class="card space-y-2" data-testid="user-detail">
    <div class="font-medium">
      {{ user.email }}
      <span v-if="user.username && user.username !== user.email" class="font-normal text-accent-500">({{ user.username }})</span>
    </div>
    <div>{{ t('users.balance') }} {{ formatMoney(user.balance) }}</div>
    <div v-if="user.todayActualCost != null">{{ t('users.todayActual', { amount: formatMoney(user.todayActualCost) }) }}</div>
    <QuotaWindowGrid v-if="quotas?.length" :windows="quotas" />
    <div class="flex gap-2">
      <button class="btn btn-primary text-xs" type="button" data-testid="adjust-balance" :disabled="readOnly" @click="emit('adjust')">{{ t('users.adjust') }}</button>
      <button class="btn btn-secondary text-xs" type="button" data-testid="reset-user-quota" :disabled="readOnly" @click="emit('resetQuota')">{{ t('users.resetWindow') }}</button>
    </div>
  </div>
</template>
