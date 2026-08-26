<script setup lang="ts">
import { ALL_INSTANCES_ID, type PlatformConnection } from '@/domain/models'
import { t } from '@/i18n'
defineProps<{ connections: PlatformConnection[]; modelValue: string }>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()
</script>

<template>
  <div class="flex flex-wrap gap-1" data-testid="instance-switcher" role="tablist" :aria-label="t('instances.aria')">
    <button
      type="button"
      role="tab"
      data-testid="instance-tab-all"
      class="rounded-xl px-3 py-1 text-xs"
      :class="modelValue === ALL_INSTANCES_ID ? 'bg-primary-500 text-white' : 'bg-accent-100 dark:bg-dark-800'"
      :aria-selected="modelValue === ALL_INSTANCES_ID"
      @click="emit('update:modelValue', ALL_INSTANCES_ID)"
    >
      {{ t('instances.all') }}
    </button>
    <button
      v-for="c in connections"
      :key="c.id"
      type="button"
      role="tab"
      :data-testid="`instance-tab-${c.id}`"
      class="max-w-[9rem] truncate rounded-xl px-3 py-1 text-xs"
      :class="modelValue === c.id ? 'bg-primary-500 text-white' : 'bg-accent-100 dark:bg-dark-800'"
      :aria-selected="modelValue === c.id"
      :title="c.name"
      @click="emit('update:modelValue', c.id)"
    >
      {{ c.name }}
    </button>
  </div>
</template>
