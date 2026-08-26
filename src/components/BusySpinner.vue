<script setup lang="ts">
withDefaults(defineProps<{ size?: string }>(), { size: '0.75rem' })
</script>

<template>
  <span
    class="inline-block animate-spin rounded-full border-2 border-current border-t-transparent"
    :style="{ width: size, height: size }"
    aria-hidden="true"
  />
</template>
