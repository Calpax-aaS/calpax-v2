import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ALGO = 'aes-256-gcm' as const
const IV_LENGTH = 12
const TAG_LENGTH = 16
const KEY_LENGTH = 32

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex) throw new Error('ENCRYPTION_KEY missing from environment')
  const key = Buffer.from(hex, 'hex')
  if (key.length !== KEY_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be 32 bytes (64 hex chars), got ${key.length} bytes`)
  }
  return key
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGO, getKey(), iv)
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, enc]).toString('base64')
}

export function decrypt(ciphertext: string): string {
  const buf = Buffer.from(ciphertext, 'base64')
  if (buf.length < IV_LENGTH + TAG_LENGTH) {
    throw new Error('ciphertext too short')
  }
  const iv = buf.subarray(0, IV_LENGTH)
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const enc = buf.subarray(IV_LENGTH + TAG_LENGTH)
  const decipher = createDecipheriv(ALGO, getKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8')
}

export function safeDecryptInt(encrypted: string | null | undefined, fallback: number = 0): number {
  if (!encrypted) return fallback
  try {
    const parsed = parseInt(decrypt(encrypted), 10)
    return isNaN(parsed) ? fallback : parsed
  } catch {
    return fallback
  }
}

export function safeDecryptIntOrNull(encrypted: string | null | undefined): number | null {
  if (!encrypted) return null
  try {
    const parsed = parseInt(decrypt(encrypted), 10)
    return isNaN(parsed) ? null : parsed
  } catch {
    return null
  }
}

export function safeDecryptString(
  encrypted: string | null | undefined,
  fallback: string | null = null,
): string | null {
  if (!encrypted) return fallback
  try {
    return decrypt(encrypted)
  } catch {
    return fallback
  }
}
