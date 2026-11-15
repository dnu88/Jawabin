import { HttpError } from './http.js'
import { db, check } from './db.js'
import { decrypt } from './crypto.js'
import { lookup } from 'node:dns/promises'

const openAiBases = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com',
  openrouter: 'https://openrouter.ai/api/v1',
  sumopod: 'https://ai.sumopod.com/v1',
  zai: 'https://api.z.ai/api/paas/v4',
  zai_code: 'https://api.z.ai/api/coding/paas/v4',
}
export const providerTypes = ['gemini', 'anthropic', '9router', ...Object.keys(openAiBases)]

const privateV4 = [/^0\./, /^10\./, /^127\./, /^169\.254\./, /^192\.168\./, /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\./]
const inCidr172 = (ip) => {
  const [, second] = ip.split('.').map(Number)
  return second >= 16 && second <= 31
}
const isPrivateAddress = (address) => {
  const ip = String(address).toLowerCase()
  if (ip.includes(':')) return ip === '::1' || ip === '::' || /^f[cd]/.test(ip) || /^fe[89ab]/.test(ip) || ip.startsWith('::ffff:')
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return true
  return privateV4.some((pattern) => pattern.test(ip)) || inCidr172(ip)
}

// Custom endpoints are fetched from the server, so they must resolve to public
// addresses. Name-only checks are not enough: a public-looking hostname can
// resolve to loopback or link-local (e.g. 127.0.0.1.nip.io).
export async function checkEndpoint(value) {
  let url
  try {
    url = new URL(value)
  } catch {
    throw new HttpError(400, 'endpoint is not a valid URL')
  }
  const host = url.hostname.replace(/^\[|\]$/g, '')
  const isLocalName = host == 'localhost' || host.endsWith('.local') || host.endsWith('.internal')
  if (url.protocol != 'https:' || isLocalName) throw new HttpError(400, 'endpoint must be a public https address')
  let addresses
  try {
    addresses = await lookup(host, { all: true, verbatim: true })
  } catch {
    throw new HttpError(400, 'endpoint host could not be resolved')
  }
  if (!addresses.length || addresses.some((entry) => isPrivateAddress(entry.address))) {
    throw new HttpError(400, 'endpoint must be a public https address')
  }
  return url.toString().replace(/\/$/, '')
}

async function post(url, headers, body) {
  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
      redirect: 'error',
      signal: AbortSignal.timeout(20000),
    })
  } catch {
    // Fetch errors can carry the full URL; never forward them to the client.
    throw new HttpError(502, 'AI provider did not answer')
  }
  const raw = await response.json().catch(() => ({}))
  if (!response.ok) {
    // Provider errors can echo the request URL or credentials back at us.
    const secrets = Object.values(headers).map((value) => String(value).replace(/^Bearer /, ''))
    let message = String(raw.error?.message || raw.message || 'request failed').replace(/https?:\/\/\S+/g, '[redacted URL]')
    for (const secret of secrets.filter(Boolean)) message = message.replaceAll(secret, '[redacted]')
    throw new HttpError(400, `AI provider error ${response.status}: ${message}`)
  }
  return raw
}

// Returns { text, tokens, request, response } for one prompt.
export async function generate({ type, url, model, token }, { system = '', user }) {
  if (type == 'gemini') {
    const request = { contents: [{ role: 'user', parts: [{ text: user }] }] }
    if (system) request.systemInstruction = { parts: [{ text: system }] }
    const response = await post(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      { 'x-goog-api-key': token },
      request,
    )
    const text = (response.candidates?.[0]?.content?.parts || []).map((part) => part.text || '').join('')
    return { text: text.trim(), tokens: response.usageMetadata?.totalTokenCount || 0, request, response }
  }
  if (type == 'anthropic') {
    const request = { model, max_tokens: 1024, messages: [{ role: 'user', content: user }] }
    if (system) request.system = system
    const response = await post('https://api.anthropic.com/v1/messages', { 'x-api-key': token, 'anthropic-version': '2023-06-01' }, request)
    const text = (response.content || []).map((part) => part.text || '').join('')
    const tokens = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)
    return { text: text.trim(), tokens, request, response }
  }
  const base = ['openai', '9router'].includes(type) && url ? await checkEndpoint(url) : openAiBases[type]
  if (!base) throw new HttpError(400, 'endpoint is required for this provider')
  const messages = [...(system ? [{ role: 'system', content: system }] : []), { role: 'user', content: user }]
  const request = { model, messages }
  const response = await post(`${base}/chat/completions`, { authorization: `Bearer ${token}` }, request)
  return { text: (response.choices?.[0]?.message?.content || '').trim(), tokens: response.usage?.total_tokens || 0, request, response }
}

export async function logUsage(userId, type, result) {
  check(await db().from('ai_usage').insert({ user_id: userId, type, token: result.tokens, data: { request: result.request, response: result.response } }))
}

export async function loadSettings(userId) {
  const row = check(await db().from('ai_settings').select('*').eq('user_id', userId).maybeSingle())
  if (!row?.token_encrypted) return null
  return { type: row.type, url: row.url, model: row.model, token: decrypt(row.token_encrypted) }
}
