import { describe, expect, it } from 'vitest'
import { SecretVault } from '@/core/security/secret-vault'
import { memoryStorage } from '@/core/security/storage'

describe('SecretVault', () => {
  it('session put is available and UI status never includes plaintext', async () => {
    const vault = new SecretVault({ session: memoryStorage(), local: memoryStorage() })
    await vault.put('ref-1', 'plain-secret-value', false)
    const ui = await vault.getUiStatus('ref-1')
    expect(ui).toEqual({ status: 'available', persistEnabled: false, encrypted: false })
    expect(JSON.stringify(ui)).not.toContain('plain-secret-value')
    expect(await vault.revealForRequest('ref-1')).toBe('plain-secret-value')
  })

  it('plaintext persist stays available after lock and a new session', async () => {
    const local = memoryStorage()
    const vault = new SecretVault({ session: memoryStorage(), local })
    await vault.put('ref-1', 'plain-secret-value', true, false)
    expect(await local.get('vault:plain:ref-1')).toBe('plain-secret-value')
    expect(await local.get('vault:blob:ref-1')).toBeUndefined()
    await vault.lock()
    expect(await vault.getUiStatus('ref-1')).toEqual({
      status: 'available',
      persistEnabled: true,
      encrypted: false,
    })
    expect(await vault.revealForRequest('ref-1')).toBe('plain-secret-value')

    const vault2 = new SecretVault({ session: memoryStorage(), local })
    expect(await vault2.getUiStatus('ref-1')).toMatchObject({ status: 'available', encrypted: false })
    expect(await vault2.revealForRequest('ref-1')).toBe('plain-secret-value')
  })

  it('encrypts, locks, rejects wrong password, unlocks with right password', async () => {
    const session = memoryStorage()
    const local = memoryStorage()
    const vault = new SecretVault({ session, local })
    await vault.setupPersistPassword('correct-horse')
    await vault.put('ref-1', 'plain-secret-value', true, true)
    const persisted = await local.get('vault:blob:ref-1')
    expect(JSON.stringify(persisted)).not.toContain('plain-secret-value')
    expect(await local.get('vault:plain:ref-1')).toBeUndefined()
    await vault.lock()
    expect(await vault.getUiStatus('ref-1')).toMatchObject({ status: 'locked', encrypted: true })
    expect(await vault.revealForRequest('ref-1')).toBeNull()
    expect(await vault.unlock('wrong-password')).toBe(false)
    expect(await vault.getUiStatus('ref-1')).toMatchObject({ status: 'locked' })
    expect(await vault.unlock('correct-horse')).toBe(true)
    expect(await vault.getUiStatus('ref-1')).toMatchObject({ status: 'available', encrypted: true })
    expect(await vault.revealForRequest('ref-1')).toBe('plain-secret-value')
  })

  it('converts plaintext persist to encrypted and back', async () => {
    const session = memoryStorage()
    const local = memoryStorage()
    const vault = new SecretVault({ session, local })
    await vault.put('ref-1', 'plain-secret-value', true, false)
    await vault.setupPersistPassword('correct-horse')
    await vault.put('ref-1', 'plain-secret-value', true, true)
    expect(await local.get('vault:plain:ref-1')).toBeUndefined()
    await vault.lock()
    expect(await vault.getUiStatus('ref-1')).toMatchObject({ status: 'locked', encrypted: true })
    expect(await vault.unlock('correct-horse')).toBe(true)
    await vault.put('ref-1', 'plain-secret-value', true, false)
    expect(await local.get('vault:blob:ref-1')).toBeUndefined()
    await vault.lock()
    expect(await vault.getUiStatus('ref-1')).toMatchObject({ status: 'available', encrypted: false })
    expect(await vault.revealForRequest('ref-1')).toBe('plain-secret-value')
  })

  it('lock only hides encrypted secrets when mixed with plaintext persist', async () => {
    const vault = new SecretVault({ session: memoryStorage(), local: memoryStorage() })
    await vault.put('plain-ref', 'plain-keep', true, false)
    await vault.setupPersistPassword('correct-horse')
    await vault.put('enc-ref', 'enc-secret', true, true)
    await vault.lock()
    expect(await vault.getUiStatus('plain-ref')).toMatchObject({ status: 'available', encrypted: false })
    expect(await vault.revealForRequest('plain-ref')).toBe('plain-keep')
    expect(await vault.getUiStatus('enc-ref')).toMatchObject({ status: 'locked', encrypted: true })
    expect(await vault.revealForRequest('enc-ref')).toBeNull()
  })
})
