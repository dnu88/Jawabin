import { afterEach, describe, expect, it, vi } from 'vitest'

// DNS is mocked so the suite never touches the network: the point of these
// tests is that a name which LOOKS public is still rejected when it resolves
// to a private address.
vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(async (host) => {
    const table = {
      'api.example.com': [{ address: '93.184.216.34', family: 4 }],
      'provider.example.net': [{ address: '203.0.113.10', family: 4 }],
      'rebind.test': [{ address: '127.0.0.1', family: 4 }],
      'metadata.test': [{ address: '169.254.169.254', family: 4 }],
      'lan.test': [{ address: '192.168.1.10', family: 4 }],
      'v6.test': [{ address: 'fd00::1', family: 6 }],
      'mixed.test': [{ address: '93.184.216.34', family: 4 }, { address: '10.0.0.7', family: 4 }],
    }
    if (!table[host]) throw new Error('ENOTFOUND')
    return table[host]
  }),
}))

const { checkEndpoint, generate, providerTypes } = await import('../../server/ai.js')

const rejects = async (value) => {
  await expect(checkEndpoint(value)).rejects.toThrowError(/public https address|not a valid URL|could not be resolved/)
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('checkEndpoint', () => {
  it('accepts a public https endpoint and strips one trailing slash', async () => {
    await expect(checkEndpoint('https://api.example.com/v1/')).resolves.toBe('https://api.example.com/v1')
    await expect(checkEndpoint('https://api.example.com/v1')).resolves.toBe('https://api.example.com/v1')
  })

  it('rejects plain http', async () => {
    await rejects('http://api.example.com/v1')
  })

  it('rejects loopback names, .local and .internal', async () => {
    for (const value of ['https://localhost:8080/v1', 'https://LOCALHOST/v1', 'https://box.local/v1', 'https://metadata.internal/v1']) {
      await rejects(value)
    }
  })

  it('rejects literal private IPs and IPv6 loopback', async () => {
    for (const value of ['https://127.0.0.1/v1', 'https://10.0.0.5/v1', 'https://[::1]/v1']) {
      await rejects(value)
    }
  })

  it('rejects a public-looking name that resolves to a private address', async () => {
    // The old name-only check accepted these; DNS says they are not public.
    await rejects('https://rebind.test/v1')
    await rejects('https://metadata.test/latest/meta-data')
    await rejects('https://lan.test/v1')
    await rejects('https://v6.test/v1')
  })

  it('rejects when any resolved address is private', async () => {
    await rejects('https://mixed.test/v1')
  })

  it('rejects hosts that do not resolve', async () => {
    await rejects('https://does-not-exist.test/v1')
  })

  it('rejects values that are not URLs', async () => {
    await rejects('api.example.com/v1')
    await rejects('')
  })
})

describe('generate', () => {
  const key = 'sk-test-secret-value'

  it('never follows provider redirects and never forwards the fetch error text', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('redirect mode is error: https://provider.example.net/v1/chat/completions')
    })
    vi.stubGlobal('fetch', fetchMock)
    await expect(
      generate({ type: 'openai', url: 'https://provider.example.net/v1', model: 'm', token: key }, { user: 'hi' }),
    ).rejects.toThrowError(/^AI provider did not answer$/)
    expect(fetchMock.mock.calls[0][1].redirect).toBe('error')
  })

  it('redacts provider error text that echoes the endpoint or the key', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: { message: `bad key ${key} for https://provider.example.net/v1` } }), { status: 401 })),
    )
    try {
      await generate({ type: 'openai', url: 'https://provider.example.net/v1', model: 'm', token: key }, { user: 'hi' })
      expect.fail('must reject')
    } catch (error) {
      expect(error.message).toMatch(/AI provider error 401/)
      expect(error.message).not.toContain(key)
      expect(error.message).not.toMatch(/https:\/\//)
    }
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
