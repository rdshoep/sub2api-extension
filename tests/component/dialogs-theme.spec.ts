import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ConfirmActionDialog from '@/components/ConfirmActionDialog.vue'
import AccountQuotaCard from '@/components/AccountQuotaCard.vue'
import ErrorFeed from '@/components/ErrorFeed.vue'
import { createPinia, setActivePinia } from 'pinia'
import { useUiStore } from '@/stores/ui'
import type { NormalizedAccount, NormalizedError } from '@/domain/models'

describe('ConfirmActionDialog', () => {
  it('requires a reason before confirm', async () => {
    const wrapper = mount(ConfirmActionDialog, {
      props: {
        open: true,
        title: '调整余额',
        connectionName: 'Alpha',
        targetLabel: 'ops@example.test (10)',
        actionType: 'set',
        before: { balance: 1 },
      },
    })
    const submit = wrapper.get('[data-testid="confirm-submit"]')
    expect((submit.element as HTMLButtonElement).disabled).toBe(true)
    await wrapper.get('[data-testid="reason-input"]').setValue('ops adjust')
    expect((wrapper.get('[data-testid="confirm-submit"]').element as HTMLButtonElement).disabled).toBe(false)
  })
})

describe('read-only write controls', () => {
  it('disables reset on read-only connections', () => {
    const account: NormalizedAccount = {
      uid: 'c:1',
      connectionId: 'c',
      id: 1,
      name: 'Claude Prod',
      upstreamPlatform: 'anthropic',
      status: 'active',
      quotaWindows: [],
    }
    const wrapper = mount(AccountQuotaCard, { props: { account, pinned: false } })
    expect(wrapper.get('[data-testid="platform-logo-anthropic"]').attributes('aria-label')).toBe('Anthropic')
    expect(wrapper.text()).not.toContain('被动')
    expect(wrapper.text()).not.toContain('重置')
  })

  it('emits pin from the star control', async () => {
    const account: NormalizedAccount = {
      uid: 'c:2',
      connectionId: 'c',
      id: 2,
      name: 'GPT Batch',
      upstreamPlatform: 'openai',
      status: 'active',
      quotaWindows: [],
    }
    const wrapper = mount(AccountQuotaCard, { props: { account, pinned: false } })
    await wrapper.get('[data-testid="pin-account"]').trigger('click')
    expect(wrapper.emitted('pin')?.[0]).toEqual([account])
    expect(wrapper.find('[data-testid="platform-logo-openai"]').exists()).toBe(true)
  })
})

describe('error detail redaction', () => {
  it('redacts secrets when expanded', async () => {
    const item: NormalizedError = {
      uid: 'c:1',
      connectionId: 'c',
      id: 1,
      kind: 'request',
      createdAt: '2026-08-26T00:00:00Z',
      message: 'fail',
      summary: 'fail',
      detail: 'Authorization: Bearer super-secret Cookie: a=b api_key=xyz',
    }
    const wrapper = mount(ErrorFeed, { props: { items: [item] } })
    await wrapper.get('button').trigger('click')
    const detail = wrapper.get('[data-testid="error-detail"]').text()
    expect(detail).not.toContain('super-secret')
    expect(detail).toMatch(/REDACTED/)
  })
})

describe('theme tokens', () => {
  it('toggles light/dark class', () => {
    setActivePinia(createPinia())
    document.documentElement.className = ''
    const ui = useUiStore()
    ui.theme = 'light'
    ui.toggleTheme()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    ui.toggleTheme()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
