<script setup lang="ts">
defineProps<{ title: string; body?: string }>()
</script>

<template>
  <div class="card text-center text-sm">
    <div class="font-medium">{{ title }}</div>
    <p v-if="body" class="mt-1 text-accent-500">{{ body }}</p>
    <slot />
  </div>
</template>
