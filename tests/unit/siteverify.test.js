import { describe, expect, it } from 'vitest'
import { siteVerification } from '../../server/routes/siteverify.js'

describe('search console verification file', () => {
  it('answers with the exact line Google expects', async () => {
    const response = siteVerification('google1a2b3c4d5e6f7a8b.html')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
    expect(await response.text()).toBe('google-site-verification: google1a2b3c4d5e6f7a8b.html')
  })

  it('refuses anything that is not a verification file', () => {
    for (const name of ['', 'index.html', 'google.html', 'googlex.html', '../google1a2b3c4d.html', 'google1a2b3c4d5e6f7a8b.html.txt']) {
      expect(() => siteVerification(name)).toThrow(/not found/)
    }
  })
})
