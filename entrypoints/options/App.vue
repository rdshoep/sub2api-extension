<script setup lang="ts">
import { onMounted } from 'vue'
import InstancesView from '@/views/InstancesView.vue'
import { applyDocumentLang, t } from '@/i18n'

onMounted(applyDocumentLang)
</script>

<template>
  <div class="mx-auto max-w-xl p-4">
    <h1 class="mb-3 text-lg font-semibold">{{ t('instances.manage') }}</h1>
    <InstancesView />
  </div>
</template>
