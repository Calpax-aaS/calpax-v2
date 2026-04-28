import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('lib/crypto', () => {
  const validKey = 'a'.repeat(64) // 32 bytes hex
  let originalKey: string | undefined

  beforeEach(() => {
    vi.resetModules()
    originalKey = process.env.ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = validKey
  })

  afterEach(() => {
    process.env.ENCRYPTION_KEY = originalKey
    vi.resetModules()
  })

  it('round-trips ASCII strings', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto')
    const plain = 'hello world'
    expect(decrypt(encrypt(plain))).toBe(plain)
  })

  it('round-trips UTF-8 strings with accents', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto')
    const plain = 'Olivier Cuenot — 85 kg — 01 02 03 04 05'
    expect(decrypt(encrypt(plain))).toBe(plain)
  })

  it('round-trips empty strings', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto')
    expect(decrypt(encrypt(''))).toBe('')
  })

  it('produces different ciphertexts for same plaintext (random IV)', async () => {
    const { encrypt } = await import('@/lib/crypto')
    expect(encrypt('same')).not.toBe(encrypt('same'))
  })

  it('throws if ciphertext is tampered (1 byte flipped)', async () => {
    const { encrypt, decrypt } = await import('@/lib/crypto')
    const ct = encrypt('hello')
    const buf = Buffer.from(ct, 'base64')

    buf[buf.length - 1]! ^= 0xff
    expect(() => decrypt(buf.toString('base64'))).toThrow()
  })

  it('throws if ENCRYPTION_KEY is missing', async () => {
    delete process.env.ENCRYPTION_KEY
    const { encrypt } = await import('@/lib/crypto')
    expect(() => encrypt('x')).toThrow(/ENCRYPTION_KEY missing/)
  })

  it('throws if ENCRYPTION_KEY is wrong length', async () => {
    process.env.ENCRYPTION_KEY = 'abcd'
    const { encrypt } = await import('@/lib/crypto')
    expect(() => encrypt('x')).toThrow(/32 bytes/)
  })

  it('safeDecryptInt logs and falls back when ciphertext is corrupt', async () => {
    const errorSpy = vi.fn()
    vi.doMock('@/lib/logger', () => ({ logger: { error: errorSpy } }))
    const { safeDecryptInt } = await import('@/lib/crypto')

    // Garbage ciphertext, should not throw, should log, should return fallback
    expect(safeDecryptInt('not-a-real-ciphertext', 42)).toBe(42)
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(String) }),
      'safeDecryptInt: failed',
    )
  })

  it('safeDecryptString logs and falls back when ciphertext is corrupt', async () => {
    const errorSpy = vi.fn()
    vi.doMock('@/lib/logger', () => ({ logger: { error: errorSpy } }))
    const { safeDecryptString } = await import('@/lib/crypto')

    expect(safeDecryptString('garbage', 'fallback')).toBe('fallback')
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(String) }),
      'safeDecryptString: failed',
    )
  })

  it('safeDecrypt* return fallback for null/undefined without logging', async () => {
    const errorSpy = vi.fn()
    vi.doMock('@/lib/logger', () => ({ logger: { error: errorSpy } }))
    const { safeDecryptInt, safeDecryptString } = await import('@/lib/crypto')

    expect(safeDecryptInt(null, 7)).toBe(7)
    expect(safeDecryptInt(undefined, 9)).toBe(9)
    expect(safeDecryptString(null, 'x')).toBe('x')
    expect(errorSpy).not.toHaveBeenCalled()
  })
})
