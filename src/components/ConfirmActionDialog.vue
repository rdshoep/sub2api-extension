<script setup lang="ts">
import { computed, ref } from 'vue'
import { t } from '@/i18n'

const props = defineProps<{
  open: boolean
  title: string
  connectionName: string
  targetLabel: string
  actionType: string
  before: unknown
  afterExpected?: unknown
  confirmDisabled?: boolean
  readOnly?: boolean
}>()

const emit = defineEmits<{
  (e: 'cancel'): void
  (e: 'confirm', reason: string): void
}>()

const reason = ref('')
const submitting = ref(false)
const canSubmit = computed(() => reason.value.trim().length > 0 && !props.readOnly && !submitting.value)

function submit() {
  if (!canSubmit.value) return
  submitting.value = true
  emit('confirm', reason.value.trim())
  submitting.value = false
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-40 flex items-end bg-black/40 p-3" data-testid="confirm-dialog">
    <div class="card w-full space-y-3">
      <h2 class="text-base font-semibold">{{ title }}</h2>
      <p class="text-xs text-accent-500">{{ t('confirm.instance', { name: connectionName }) }}</p>
      <p class="text-xs">{{ t('confirm.target', { label: targetLabel }) }}</p>
      <p class="text-xs">{{ t('confirm.action', { action: actionType }) }}</p>
      <pre class="max-h-24 overflow-auto rounded-xl bg-accent-50 p-2 text-[11px] dark:bg-dark-800" data-testid="confirm-before">{{ t('confirm.before') }}{{ JSON.stringify(before, null, 2) }}</pre>
      <pre v-if="afterExpected" class="max-h-24 overflow-auto rounded-xl bg-accent-50 p-2 text-[11px] dark:bg-dark-800">{{ t('confirm.after') }}{{ JSON.stringify(afterExpected, null, 2) }}</pre>
      <p v-if="readOnly" class="text-xs text-red-500" data-testid="readonly-hint">{{ t('confirm.readonly') }}</p>
      <label class="block text-xs">
        {{ t('confirm.reason') }}
        <input v-model="reason" class="field mt-1" data-testid="reason-input" :disabled="readOnly" />
      </label>
      <div class="flex justify-end gap-2">
        <button class="btn btn-secondary" type="button" @click="emit('cancel')">{{ t('confirm.cancel') }}</button>
        <button class="btn btn-primary" type="button" data-testid="confirm-submit" :disabled="!canSubmit" @click="submit">{{ t('confirm.submit') }}</button>
      </div>
    </div>
  </div>
</template>
