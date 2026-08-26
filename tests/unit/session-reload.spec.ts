import { describe, expect, it } from 'vitest'
import { ConsoleKernel } from '@/core/kernel'
import { TypedHttpClient } from '@/core/http/client'
import { memoryStorage } from '@/core/security/storage'
import { createMockFetch } from '../mocks/mock-fetch'
import { ALPHA_ORIGIN } from '../mocks/fixtures'

function kernelOf(local = memoryStorage(), session = memoryStorage()) {
  return new ConsoleKernel({
    local,
    session,
    permissions: { async request() { return true }, async contains() { return true } },
    http: new TypedHttpClient({ fetchImpl: createMockFetch() }),
  })
}

describe('reload persistence', () => {
  it('keeps metadata in local storage and requires session credentials again', async () => {
    const local = memoryStorage()
    const kernel1 = kernelOf(local)
    const added = await kernel1.addConnection({
      name: 'Alpha',
      baseUrl: ALPHA_ORIGIN,
      authMode: 'admin-api-key',
      secret: 'session-only-secret',
      readOnly: true,
      persistSecrets: false,
    })
    const kernel2 = kernelOf(local)
    const listed = await kernel2.connections.list()
    expect(listed).toHaveLength(1)
    expect(listed[0].name).toBe('Alpha')
    expect(JSON.stringify(listed)).not.toContain('session-only-secret')
    const status = await kernel2.vault.getUiStatus(added.authRef)
    expect(status.status).toBe('missing')
    expect(await kernel2.vault.revealForRequest(added.authRef)).toBeNull()
    await kernel2.putSecret(added.id, 'session-only-secret')
    expect(await kernel2.vault.getUiStatus(added.authRef)).toMatchObject({ status: 'available' })
    const put = await kernel2.putSecret(added.id, 'session-only-secret')
    expect(JSON.stringify(put)).not.toContain('session-only-secret')
  })

  it('unlocked persist stays available after a new session', async () => {
    const local = memoryStorage()
    const kernel1 = kernelOf(local)
    const added = await kernel1.addConnection({
      name: 'Alpha',
      baseUrl: ALPHA_ORIGIN,
      authMode: 'admin-api-key',
      secret: 'remembered-secret',
      readOnly: true,
    })
    expect(added.persistSecrets).toBe(true)
    expect(added.lockSecrets).toBe(false)
    const kernel2 = kernelOf(local)
    const listed = await kernel2.connections.list()
    expect(JSON.stringify(listed)).not.toContain('remembered-secret')
    expect(await kernel2.vault.getUiStatus(added.authRef)).toMatchObject({
      status: 'available',
      persistEnabled: true,
      encrypted: false,
    })
    expect(await kernel2.vault.revealForRequest(added.authRef)).toBe('remembered-secret')
    const overview = await kernel2.getOverview(added.id)
    expect(overview.aggregated.requests).toBeGreaterThan(0)
  })

  it('can lock an unlocked account then remove the password', async () => {
    const local = memoryStorage()
    const kernel = kernelOf(local)
    const added = await kernel.addConnection({
      name: 'Alpha',
      baseUrl: ALPHA_ORIGIN,
      authMode: 'admin-api-key',
      secret: 'remembered-secret',
      readOnly: true,
    })
    await kernel.setConnectionPassword(added.id, 'correct-horse')
    expect((await kernel.connections.get(added.id))?.lockSecrets).toBe(true)
    await kernel.vault.lock()
    expect(await kernel.vault.getUiStatus(added.authRef)).toMatchObject({ status: 'locked', encrypted: true })
    await kernel.clearConnectionPassword(added.id, 'correct-horse')
    expect((await kernel.connections.get(added.id))?.lockSecrets).toBe(false)
    await kernel.vault.lock()
    expect(await kernel.vault.getUiStatus(added.authRef)).toMatchObject({ status: 'available', encrypted: false })
    expect(await kernel.vault.revealForRequest(added.authRef)).toBe('remembered-secret')
  })
})
