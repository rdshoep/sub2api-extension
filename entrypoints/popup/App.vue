<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import AppShell from '@/components/AppShell.vue'
import EmptyState from '@/components/EmptyState.vue'
import SecretUnlockDialog from '@/components/SecretUnlockDialog.vue'
import OverviewView from '@/views/OverviewView.vue'
import AccountsView from '@/views/AccountsView.vue'
import UsersView from '@/views/UsersView.vue'
import ErrorsView from '@/views/ErrorsView.vue'
import InstancesView from '@/views/InstancesView.vue'
import { rpc } from '@/core/messaging/client'
import type { PlatformConnection } from '@/domain/models'
import { useUiStore } from '@/stores/ui'
import { applyDocumentLang, t } from '@/i18n'

const ui = useUiStore()
const connections = ref<PlatformConnection[]>([])
const unlockOpen = ref(false)
const panel = ref<{ load?: () => Promise<void> } | null>(null)

async function refresh() {
  connections.value = await rpc('connections.list')
  ui.ensureConnection(connections.value.map((c) => c.id))
  await panel.value?.load?.()
}

async function openAdmin() {
  const id = ui.connectionId === '__all__' ? connections.value[0]?.id : ui.connectionId
  if (!id) return
  const links = await rpc('links.get', { connectionId: id })
  window.open(links.dashboard, '_blank')
}

async function lockVault() {
  await rpc('secrets.lock')
  unlockOpen.value = false
  await refresh()
}

async function unlockVault(password: string) {
  const result = await rpc('secrets.unlock', { password })
  if (result.ok) unlockOpen.value = false
  await refresh()
}

watch(() => ui.view, () => {
  void refresh()
})

onMounted(async () => {
  ui.applyTheme()
  applyDocumentLang()
  await refresh()
  if (!connections.value.length) {
    ui.setView('instances')
    return
  }
  const statuses = await Promise.all(
    connections.value.map((c) => rpc('secrets.status', { connectionId: c.id })),
  )
  if (statuses.some((s) => s.status !== 'available')) ui.setView('instances')
})
</script>

<template>
  <AppShell :connections="connections" @refresh="refresh" @open-admin="openAdmin" @lock="lockVault" @unlock="unlockOpen = true">
    <EmptyState v-if="!connections.length && ui.view === 'overview'" :title="t('instances.emptyTitle')" :body="t('instances.emptyBody')" />
    <OverviewView v-else-if="ui.view === 'overview'" ref="panel" />
    <AccountsView v-else-if="ui.view === 'accounts'" ref="panel" />
    <UsersView v-else-if="ui.view === 'users'" ref="panel" />
    <ErrorsView v-else-if="ui.view === 'errors'" ref="panel" />
    <InstancesView v-else ref="panel" @updated="refresh" @unlock="unlockOpen = true" />
    <SecretUnlockDialog :open="unlockOpen" @cancel="unlockOpen = false" @unlock="unlockVault" />
  </AppShell>
</template>
