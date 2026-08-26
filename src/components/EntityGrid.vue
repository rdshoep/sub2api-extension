<script setup lang="ts">
defineProps<{ empty?: boolean }>()
</script>

<template>
  <div class="grid grid-cols-2 gap-2">
    <slot />
  </div>
</template>
