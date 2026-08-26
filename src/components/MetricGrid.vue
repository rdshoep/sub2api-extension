<script setup lang="ts">
import MetricCard from './MetricCard.vue'
defineProps<{
  items: Array<{
    id?: string
    label: string
    value: string | number
    hint?: string
    raw?: number
    format?: (n: number) => string
  }>
}>()
</script>

<template>
  <div class="grid grid-cols-4 gap-1.5">
    <MetricCard v-for="item in items" :key="item.id || item.label" v-bind="item" />
  </div>
</template>
