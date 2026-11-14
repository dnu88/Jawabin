import { describe, expect, it } from 'vitest'
import { checkEndpoint, providerTypes } from '../../server/ai.js'

const rejects = (value) => expect(() => checkEndpoint(value)).toThrowError(/public https address|not a valid URL/)

describe('checkEndpoint', () => {
  it('accepts public https endpoints and strips one trailing slash', () => {
    expect(checkEndpoint('https://api.example.com/v1/')).toBe('https://api.example.com/v1')
    expect(checkEndpoint('https://api.example.com/v1')).toBe('https://api.example.com/v1')
  })

  it('rejects plain http', () => {
    rejects('http://api.example.com/v1')
  })

  it('rejects loopback, .local, .internal and raw IPs', () => {
    for (const value of [
      'https://localhost:8080/v1',
      'https://LOCALHOST/v1',
      'https://box.local/v1',
      'https://metadata.internal/v1',
      'https://127.0.0.1/v1',
      'https://10.0.0.5/v1',
      'https://[::1]/v1',
    ]) {
      expect(() => checkEndpoint(value), value).toThrow()
    }
  })

  it('rejects values that are not URLs', () => {
    rejects('api.example.com/v1')
    rejects('')
  })
})

describe('providerTypes', () => {
  it('lists the providers the UI can save', () => {
    for (const type of ['gemini', 'anthropic', '9router', 'openai', 'deepseek', 'openrouter', 'sumopod', 'zai', 'zai_code']) {
      expect(providerTypes).toContain(type)
    }
  })

  it('has no duplicates', () => {
    expect(new Set(providerTypes).size).toBe(providerTypes.length)
  })
})
