<script setup lang="ts">
import { isBusy } from '@/core/messaging/busy'
</script>

<template>
  <div
    v-show="isBusy"
    class="pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden"
    data-testid="request-progress"
  >
    <div class="request-progress-bar h-full w-1/3 rounded-full bg-primary-500" />
  </div>
</template>
