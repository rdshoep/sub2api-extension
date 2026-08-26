<script setup lang="ts">
import { ref } from 'vue'
import { t } from '@/i18n'
defineProps<{ open: boolean }>()
const emit = defineEmits<{ (e: 'cancel'): void; (e: 'unlock', password: string): void }>()
const password = ref('')
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-40 flex items-end bg-black/40 p-3">
    <div class="card w-full space-y-3">
      <h2 class="text-base font-semibold">{{ t('unlock.title') }}</h2>
      <input v-model="password" class="field" type="password" data-testid="unlock-password" :placeholder="t('unlock.password')" />
      <div class="flex justify-end gap-2">
        <button class="btn btn-secondary" type="button" @click="emit('cancel')">{{ t('unlock.cancel') }}</button>
        <button class="btn btn-primary" type="button" data-testid="unlock-submit" @click="emit('unlock', password)">{{ t('unlock.submit') }}</button>
      </div>
    </div>
  </div>
</template>
