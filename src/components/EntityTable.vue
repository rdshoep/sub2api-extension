<script setup lang="ts">
defineProps<{ columns: string[] }>()
</script>

<template>
  <table class="w-full text-left text-xs">
    <thead>
      <tr class="text-accent-500">
        <th v-for="c in columns" :key="c">{{ c }}</th>
      </tr>
    </thead>
    <tbody>
      <slot />
    </tbody>
  </table>
</template>
