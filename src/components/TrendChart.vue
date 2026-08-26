<script setup lang="ts">
defineProps<{ points?: Array<{ label: string; value: number }> }>()
</script>

<template>
  <div class="card text-xs text-accent-500">趋势图仅用于模型/概览条形补充，环形图只用于额度。</div>
</template>
