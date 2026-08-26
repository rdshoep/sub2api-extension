import type { VaultUiStatus } from '@/domain/models'
import type { KeyValueStorage } from './storage'

const SESSION_PLAIN_PREFIX = 'vault:session:'
const SESSION_DEK = 'vault:dek'
const LOCAL_PLAIN_PREFIX = 'vault:plain:'
const LOCAL_BLOB_PREFIX = 'vault:blob:'
const LOCAL_META = 'vault:crypto-meta'
const PBKDF2_ITERATIONS = 210_000

export interface VaultUiView {
  status: VaultUiStatus
  persistEnabled: boolean
  encrypted: boolean
}

export interface SecretVaultOptions {
  session: KeyValueStorage
  local: KeyValueStorage
  crypto?: Crypto
}

interface EncryptedBlob {
  iv: string
  ciphertext: string
}

interface CryptoMeta {
  salt: string
  wrappedDek: EncryptedBlob
}

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary)
}

function b64ToBuf(b64: string): ArrayBuffer {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

export class SecretVault {
  private readonly session: KeyValueStorage
  private readonly local: KeyValueStorage
  private readonly crypto: Crypto

  constructor(opts: SecretVaultOptions) {
    this.session = opts.session
    this.local = opts.local
    this.crypto = opts.crypto ?? globalThis.crypto
  }

  async put(ref: string, secret: string, persist: boolean, encrypt = false): Promise<void> {
    if (!ref) throw new Error('authRef is required')
    if (!secret) throw new Error('secret is required')
    await this.session.set(`${SESSION_PLAIN_PREFIX}${ref}`, secret)
    if (!persist && !encrypt) {
      await this.local.remove(`${LOCAL_PLAIN_PREFIX}${ref}`)
      await this.local.remove(`${LOCAL_BLOB_PREFIX}${ref}`)
      return
    }
    if (encrypt) {
      const dek = await this.requireDek()
      const blob = await this.encrypt(dek, secret)
      await this.local.set(`${LOCAL_BLOB_PREFIX}${ref}`, blob)
      await this.local.remove(`${LOCAL_PLAIN_PREFIX}${ref}`)
      return
    }
    await this.local.set(`${LOCAL_PLAIN_PREFIX}${ref}`, secret)
    await this.local.remove(`${LOCAL_BLOB_PREFIX}${ref}`)
  }

  async remove(ref: string): Promise<void> {
    await this.session.remove(`${SESSION_PLAIN_PREFIX}${ref}`)
    await this.local.remove(`${LOCAL_PLAIN_PREFIX}${ref}`)
    await this.local.remove(`${LOCAL_BLOB_PREFIX}${ref}`)
  }

  async getUiStatus(ref: string): Promise<VaultUiView> {
    const sessionValue = await this.session.get(`${SESSION_PLAIN_PREFIX}${ref}`)
    const localPlain = await this.local.get(`${LOCAL_PLAIN_PREFIX}${ref}`)
    const blob = await this.local.get(`${LOCAL_BLOB_PREFIX}${ref}`)
    const hasPlain = typeof localPlain === 'string' && localPlain.length > 0
    const encrypted = blob != null && !hasPlain
    const persistEnabled = hasPlain || blob != null
    if (typeof sessionValue === 'string' && sessionValue.length > 0) {
      return { status: 'available', persistEnabled, encrypted }
    }
    if (hasPlain) {
      return { status: 'available', persistEnabled: true, encrypted: false }
    }
    if (blob) {
      return { status: 'locked', persistEnabled: true, encrypted: true }
    }
    return { status: 'missing', persistEnabled: false, encrypted: false }
  }

  async hasDek(): Promise<boolean> {
    const existing = await this.session.get(SESSION_DEK)
    return typeof existing === 'string' && existing.length > 0
  }

  async hasMeta(): Promise<boolean> {
    const meta = (await this.local.get(LOCAL_META)) as CryptoMeta | undefined
    return Boolean(meta?.salt && meta.wrappedDek)
  }

  async lock(): Promise<void> {
    const all = await this.session.getAll()
    for (const key of Object.keys(all)) {
      if (key.startsWith(SESSION_PLAIN_PREFIX) || key === SESSION_DEK) {
        await this.session.remove(key)
      }
    }
  }

  async setupPersistPassword(password: string): Promise<void> {
    if (!password) throw new Error('Password is required')
    const dek = await this.requireDek()
    const salt = this.crypto.getRandomValues(new Uint8Array(16))
    const wrappingKey = await this.deriveKey(password, salt)
    const wrappedDek = await this.encrypt(wrappingKey, bufToB64(await this.crypto.subtle.exportKey('raw', dek)))
    const meta: CryptoMeta = { salt: bufToB64(salt.buffer), wrappedDek }
    await this.local.set(LOCAL_META, meta)
  }

  async unlock(password: string): Promise<boolean> {
    const meta = (await this.local.get(LOCAL_META)) as CryptoMeta | undefined
    if (!meta?.salt || !meta.wrappedDek) return false
    try {
      const wrappingKey = await this.deriveKey(password, new Uint8Array(b64ToBuf(meta.salt)))
      const rawDek = await this.decrypt(wrappingKey, meta.wrappedDek)
      const dek = await this.crypto.subtle.importKey('raw', b64ToBuf(rawDek), { name: 'AES-GCM' }, true, [
        'encrypt',
        'decrypt',
      ])
      await this.session.set(SESSION_DEK, bufToB64(await this.crypto.subtle.exportKey('raw', dek)))
      const all = await this.local.getAll()
      for (const [key, blob] of Object.entries(all)) {
        if (!key.startsWith(LOCAL_BLOB_PREFIX)) continue
        const ref = key.slice(LOCAL_BLOB_PREFIX.length)
        const plain = await this.decrypt(dek, blob as EncryptedBlob)
        await this.session.set(`${SESSION_PLAIN_PREFIX}${ref}`, plain)
      }
      return true
    } catch {
      return false
    }
  }

  /**
   * Background-only. Never expose this through UI RPC.
   */
  async revealForRequest(ref: string): Promise<string | null> {
    const value = await this.session.get(`${SESSION_PLAIN_PREFIX}${ref}`)
    if (typeof value === 'string' && value.length > 0) return value
    const localPlain = await this.local.get(`${LOCAL_PLAIN_PREFIX}${ref}`)
    return typeof localPlain === 'string' && localPlain.length > 0 ? localPlain : null
  }

  private async requireDek(): Promise<CryptoKey> {
    const existing = await this.session.get(SESSION_DEK)
    if (typeof existing === 'string') {
      return this.crypto.subtle.importKey('raw', b64ToBuf(existing), { name: 'AES-GCM' }, true, ['encrypt', 'decrypt'])
    }
    const dek = await this.crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt'])
    await this.session.set(SESSION_DEK, bufToB64(await this.crypto.subtle.exportKey('raw', dek)))
    return dek
  }

  private async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const material = await this.crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, [
      'deriveKey',
    ])
    return this.crypto.subtle.deriveKey(
      { name: 'PBKDF2', salt: salt as BufferSource, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    )
  }

  private async encrypt(key: CryptoKey, plaintext: string): Promise<EncryptedBlob> {
    const iv = this.crypto.getRandomValues(new Uint8Array(12))
    const ciphertext = await this.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plaintext))
    return { iv: bufToB64(iv.buffer), ciphertext: bufToB64(ciphertext) }
  }

  private async decrypt(key: CryptoKey, blob: EncryptedBlob): Promise<string> {
    const plain = await this.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(b64ToBuf(blob.iv)) },
      key,
      b64ToBuf(blob.ciphertext),
    )
    return new TextDecoder().decode(plain)
  }
}
