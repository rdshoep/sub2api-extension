<script setup lang="ts">
import AnimatedNumber from './AnimatedNumber.vue'

defineProps<{
  id?: string
  label: string
  value: string | number
  hint?: string
  raw?: number
  format?: (n: number) => string
}>()
</script>

<template>
  <div class="card flex min-h-[52px] flex-col items-center justify-center p-2 text-center" :data-testid="`metric-${id || label}`">
    <div class="text-[10px] leading-tight text-accent-500">{{ label }}</div>
    <div class="truncate text-sm font-semibold" :title="hint || String(value)">
      <span class="sr-only">{{ value }}</span>
      <AnimatedNumber :value="value" :raw="raw" :format="format" aria-hidden="true" />
    </div>
  </div>
</template>
