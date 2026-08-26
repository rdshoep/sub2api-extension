<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import ConnectionHealthBadge from '@/components/ConnectionHealthBadge.vue'
import { rpc } from '@/core/messaging/client'
import type { PlatformConnection, VaultUiStatus } from '@/domain/models'
import { t } from '@/i18n'
import BusySpinner from '@/components/BusySpinner.vue'

const emit = defineEmits<{ (e: 'updated'): void; (e: 'unlock'): void }>()
const connections = ref<PlatformConnection[]>([])
const vaultStatus = ref<Record<string, { status: VaultUiStatus; persistEnabled: boolean; encrypted: boolean }>>({})
const reenter = reactive<Record<string, string>>({})
const cardPassword = reactive<Record<string, string>>({})
const persistPassword = ref('')
const form = reactive({
  name: '',
  baseUrl: '',
  authMode: 'admin-api-key' as 'admin-api-key' | 'jwt',
  secret: '',
  readOnly: true,
  persistSecrets: true,
  lockSecrets: false,
})
const message = ref('')
const submitting = ref(false)
const testingId = ref('')

async function load() {
  connections.value = await rpc('connections.list')
  const next: Record<string, { status: VaultUiStatus; persistEnabled: boolean; encrypted: boolean }> = {}
  for (const c of connections.value) {
    next[c.id] = await rpc('secrets.status', { connectionId: c.id })
  }
  vaultStatus.value = next
}

function onPersistChange() {
  if (!form.persistSecrets) form.lockSecrets = false
}

function onLockChange() {
  if (form.lockSecrets) form.persistSecrets = true
}

async function add() {
  if (submitting.value) return
  message.value = ''
  submitting.value = true
  try {
    if (form.lockSecrets && !persistPassword.value) {
      message.value = t('instances.persistNeedPassword')
      return
    }
    await rpc('connections.add', { ...form, vaultPassword: persistPassword.value })
    form.secret = ''
    persistPassword.value = ''
    form.lockSecrets = false
    form.persistSecrets = true
    await load()
    emit('updated')
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Failed'
  } finally {
    submitting.value = false
  }
}

async function setPassword(id: string) {
  const password = cardPassword[id]
  if (!password) {
    message.value = t('instances.persistNeedPassword')
    return
  }
  try {
    await rpc('secrets.setPassword', { connectionId: id, password })
    cardPassword[id] = ''
    await load()
    emit('updated')
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Failed'
  }
}

async function clearPassword(id: string) {
  try {
    const password = cardPassword[id] || undefined
    await rpc('secrets.clearPassword', { connectionId: id, password })
    cardPassword[id] = ''
    await load()
    emit('updated')
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Failed'
  }
}

async function reenterSecret(id: string) {
  const secret = reenter[id]
  if (!secret) return
  await rpc('secrets.put', { connectionId: id, secret })
  reenter[id] = ''
  await load()
  emit('updated')
}

async function remove(id: string) {
  await rpc('connections.remove', { id })
  await load()
  emit('updated')
}

async function test(id: string) {
  if (testingId.value) return
  testingId.value = id
  try {
    await rpc('connections.test', { id })
    await load()
  } finally {
    testingId.value = ''
  }
}

onMounted(load)
defineExpose({ load })
</script>

<template>
  <div class="space-y-3">
    <div class="card space-y-2" data-testid="add-instance">
      <div class="text-sm font-medium">{{ t('instances.add') }}</div>
      <input v-model="form.name" class="field" data-testid="instance-name" :placeholder="t('instances.name')" />
      <input v-model="form.baseUrl" class="field" data-testid="instance-url" :placeholder="t('instances.url')" />
      <select v-model="form.authMode" class="field">
        <option value="admin-api-key">admin-api-key</option>
        <option value="jwt">jwt</option>
      </select>
      <input v-model="form.secret" class="field" data-testid="instance-secret" type="password" autocomplete="off" :placeholder="t('instances.secret')" />
      <label class="flex items-center gap-2 text-xs">
        <input v-model="form.readOnly" type="checkbox" /> {{ t('instances.readOnly') }}
      </label>
      <label class="flex items-center gap-2 text-xs">
        <input v-model="form.persistSecrets" type="checkbox" data-testid="persist-secrets" @change="onPersistChange" />
        {{ t('instances.persist') }}
      </label>
      <label class="flex items-center gap-2 text-xs">
        <input v-model="form.lockSecrets" type="checkbox" data-testid="lock-secrets" @change="onLockChange" />
        {{ t('instances.lockSecrets') }}
      </label>
      <p class="text-[11px] text-accent-500">{{ t('instances.persistHint') }}</p>
      <input
        v-if="form.lockSecrets"
        v-model="persistPassword"
        class="field"
        type="password"
        data-testid="persist-password"
        :placeholder="t('instances.vaultPassword')"
      />
      <button class="btn btn-primary" type="button" data-testid="add-instance-submit" :disabled="submitting" @click="add">
        <BusySpinner v-if="submitting" />
        {{ submitting ? t('busy.loading') : t('instances.testSave') }}
      </button>
      <p v-if="message" class="text-xs text-red-500">{{ message }}</p>
    </div>
    <div v-for="c in connections" :key="c.id" class="card space-y-1 text-xs" data-testid="connection-card">
      <div class="flex items-center justify-between">
        <span class="font-medium">{{ c.name }}</span>
        <ConnectionHealthBadge :status="c.status" />
      </div>
      <div>{{ c.baseUrl }}</div>
      <div>{{ t('instances.version', { version: c.version || '—' }) }} · {{ c.readOnly ? t('instances.readOnlyOn') : t('instances.writesOn') }}</div>
      <div data-testid="vault-status">{{ t('instances.vault', { status: vaultStatus[c.id]?.status || 'missing' }) }}</div>
      <div>{{ t('instances.capabilities') }} {{ Object.entries(c.capabilities).map(([k, v]) => `${k}:${v}`).join(' · ') || '—' }}</div>
      <div v-if="vaultStatus[c.id]?.status === 'missing'" class="flex gap-2">
        <input
          :value="reenter[c.id]"
          class="field"
          type="password"
          data-testid="reenter-secret"
          autocomplete="off"
          :placeholder="t('instances.reenter')"
          @input="reenter[c.id] = ($event.target as HTMLInputElement).value"
        />
        <button class="btn btn-primary" type="button" data-testid="reenter-submit" @click="reenterSecret(c.id)">{{ t('instances.saveSecret') }}</button>
      </div>
      <div v-if="vaultStatus[c.id]?.status === 'locked'" class="flex gap-2">
        <button class="btn btn-primary" type="button" data-testid="card-unlock" @click="emit('unlock')">{{ t('instances.unlockVault') }}</button>
      </div>
      <div v-if="vaultStatus[c.id]?.status === 'available' && !vaultStatus[c.id]?.encrypted" class="flex gap-2">
        <input
          :value="cardPassword[c.id]"
          class="field"
          type="password"
          data-testid="set-password-input"
          autocomplete="off"
          :placeholder="t('instances.vaultPassword')"
          @input="cardPassword[c.id] = ($event.target as HTMLInputElement).value"
        />
        <button class="btn btn-secondary" type="button" data-testid="set-password" @click="setPassword(c.id)">
          {{ t('instances.setPassword') }}
        </button>
      </div>
      <div v-if="vaultStatus[c.id]?.encrypted && vaultStatus[c.id]?.status !== 'missing'" class="flex gap-2">
        <input
          v-if="vaultStatus[c.id]?.status === 'locked'"
          :value="cardPassword[c.id]"
          class="field"
          type="password"
          data-testid="clear-password-input"
          autocomplete="off"
          :placeholder="t('instances.vaultPassword')"
          @input="cardPassword[c.id] = ($event.target as HTMLInputElement).value"
        />
        <button class="btn btn-secondary" type="button" data-testid="clear-password" @click="clearPassword(c.id)">
          {{ t('instances.clearPassword') }}
        </button>
      </div>
      <div class="flex flex-wrap gap-2">
        <button class="btn btn-secondary" type="button" data-testid="test-connection" :disabled="Boolean(testingId)" @click="test(c.id)">
          <BusySpinner v-if="testingId === c.id" />
          {{ t('instances.test') }}
        </button>
        <button class="btn btn-danger" type="button" data-testid="delete-connection" @click="remove(c.id)">{{ t('instances.delete') }}</button>
      </div>
    </div>
  </div>
</template>
