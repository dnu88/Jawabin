import { afterEach, describe, expect, it, vi } from 'vitest'
import { decrypt, encrypt, hmac, readState, safeEqual, signState } from '../../server/crypto.js'

afterEach(() => {
  vi.useRealTimers()
})

describe('encrypt / decrypt', () => {
  it('round-trips plain text, including unicode and punctuation', () => {
    for (const value of ['sk-test-1234', 'kunci:dengan.spasi dan émoji 🤔', '']) {
      expect(decrypt(encrypt(value))).toBe(value)
    }
  })

  it('produces three base64url parts and a fresh IV every time', () => {
    const a = encrypt('same input')
    const b = encrypt('same input')
    expect(a.split('.')).toHaveLength(3)
    expect(a).not.toBe(b)
    expect(a.split('.')[0]).not.toBe(b.split('.')[0])
  })

  it('rejects a tampered ciphertext instead of returning garbage', () => {
    const [iv, tag, body] = encrypt('sk-secret-token').split('.')
    const flipped = body.slice(0, -1) + (body.slice(-1) === 'A' ? 'B' : 'A')
    expect(() => decrypt([iv, tag, flipped].join('.'))).toThrow()
  })

  it('rejects a token encrypted with a different key', () => {
    const value = encrypt('sk-secret-token')
    const before = process.env.ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = 'b'.repeat(64)
    expect(() => decrypt(value)).toThrow()
    process.env.ENCRYPTION_KEY = before
  })

  it('refuses to run without a 32-byte key', () => {
    const before = process.env.ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = 'abcd'
    expect(() => encrypt('x')).toThrowError(/ENCRYPTION_KEY must be 64 hex characters/)
    process.env.ENCRYPTION_KEY = before
  })
})

describe('hmac / safeEqual', () => {
  it('is deterministic and secret-dependent', () => {
    expect(hmac('s1', 'body')).toBe(hmac('s1', 'body'))
    expect(hmac('s1', 'body')).not.toBe(hmac('s2', 'body'))
    expect(hmac('s1', 'body')).not.toBe(hmac('s1', 'bodY'))
  })

  it('safeEqual compares content and length', () => {
    expect(safeEqual('abc', 'abc')).toBe(true)
    expect(safeEqual('abc', 'abd')).toBe(false)
    expect(safeEqual('abc', 'abcd')).toBe(false)
  })
})

describe('OAuth state', () => {
  it('carries the payload through sign and read', () => {
    const state = signState({ userId: 'user-1' })
    expect(readState(state)).toMatchObject({ userId: 'user-1' })
  })

  it('rejects a payload edited by the browser', () => {
    const state = signState({ userId: 'user-1' })
    const [body, signature] = state.split('.')
    const forged = JSON.parse(Buffer.from(body, 'base64url').toString())
    forged.userId = 'someone-else'
    const tampered = `${Buffer.from(JSON.stringify(forged)).toString('base64url')}.${signature}`
    expect(() => readState(tampered)).toThrowError(/invalid state/)
  })

  it('rejects a signature from a different key', () => {
    const state = signState({ userId: 'user-1' })
    const before = process.env.ENCRYPTION_KEY
    process.env.ENCRYPTION_KEY = 'c'.repeat(64)
    expect(() => readState(state)).toThrowError(/invalid state/)
    process.env.ENCRYPTION_KEY = before
  })

  it('rejects an expired state', () => {
    const state = signState({ userId: 'user-1' }, -1)
    expect(() => readState(state)).toThrowError(/state expired/)
  })

  it('rejects empty and malformed values', () => {
    for (const value of ['', 'undefined', 'only-body', '.only-signature']) {
      expect(() => readState(value)).toThrowError(/invalid state/)
    }
  })
})
