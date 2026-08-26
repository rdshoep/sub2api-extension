<script setup lang="ts">
import { computed } from 'vue'
import InstanceSwitcher from './InstanceSwitcher.vue'
import type { PlatformConnection } from '@/domain/models'
import { useUiStore, type ConsoleView } from '@/stores/ui'
import { locale, t, toggleLocale } from '@/i18n'
import { isBusy } from '@/core/messaging/busy'
import RequestProgress from './RequestProgress.vue'
import BusySpinner from './BusySpinner.vue'

defineProps<{ connections: PlatformConnection[] }>()
const emit = defineEmits<{ (e: 'refresh'): void; (e: 'open-admin'): void; (e: 'lock'): void; (e: 'unlock'): void }>()
const ui = useUiStore()
const nav = computed(() => {
  void locale.value
  return (
    [
      { id: 'overview', key: 'nav.overview' },
      { id: 'accounts', key: 'nav.accounts' },
      { id: 'users', key: 'nav.users' },
      { id: 'errors', key: 'nav.errors' },
      { id: 'instances', key: 'nav.instances' },
    ] as const
  ).map((item) => ({ id: item.id as ConsoleView, label: t(item.key) }))
})
</script>

<template>
  <div class="relative flex min-h-full flex-col" :aria-busy="isBusy">
    <RequestProgress />
    <header class="space-y-1.5 border-b px-2 py-2" :style="{ borderColor: 'var(--border-subtle)' }">
      <InstanceSwitcher :connections="connections" :model-value="ui.connectionId" @update:model-value="ui.setConnection" />
      <div class="flex items-center justify-between gap-2">
        <nav class="flex min-w-0 flex-1 gap-1 overflow-x-auto text-xs">
          <button
            v-for="item in nav"
            :key="item.id"
            class="rounded-xl px-2.5 py-1"
            :class="ui.view === item.id ? 'bg-primary-500 text-white' : 'bg-accent-100 dark:bg-dark-800'"
            type="button"
            :data-testid="`nav-${item.id}`"
            @click="ui.setView(item.id)"
          >
            {{ item.label }}
          </button>
        </nav>
        <div class="flex shrink-0 gap-1">
          <button
            class="btn btn-secondary px-2 py-1 text-xs"
            type="button"
            data-testid="refresh-panel"
            :disabled="isBusy"
            @click="emit('refresh')"
          >
            <BusySpinner v-if="isBusy" />
            {{ isBusy ? t('busy.refreshing') : t('nav.refresh') }}
          </button>
          <button class="btn btn-secondary px-2 py-1 text-xs" type="button" data-testid="open-admin" @click="emit('open-admin')">{{ t('nav.admin') }}</button>
        </div>
      </div>
    </header>
    <main class="flex-1 space-y-3 p-2">
      <slot />
    </main>
    <footer class="flex items-center justify-between border-t px-2 py-2 text-xs" :style="{ borderColor: 'var(--border-subtle)' }">
      <div class="flex gap-1">
        <button class="btn btn-secondary px-2 py-1" type="button" data-testid="locale-toggle" :title="t('nav.language')" @click="toggleLocale">
          {{ t('nav.language') }}
        </button>
        <button class="btn btn-secondary px-2 py-1" type="button" data-testid="theme-toggle" @click="ui.toggleTheme">
          {{ ui.theme === 'dark' ? t('nav.themeLight') : t('nav.themeDark') }}
        </button>
        <button class="btn btn-secondary px-2 py-1" type="button" data-testid="lock-vault" @click="emit('lock')">{{ t('nav.lock') }}</button>
        <button class="btn btn-secondary px-2 py-1" type="button" data-testid="unlock-vault" @click="emit('unlock')">{{ t('nav.unlock') }}</button>
      </div>
    </footer>
  </div>
</template>
