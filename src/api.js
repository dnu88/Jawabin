// Mock backend. Same call shapes as the real API will need:
//   PUT /ai                 -> updateAi
//   GET /ai/usage/summary   -> getUsageSummary
//   GET /ai/usage           -> getUsage
// State lives in localStorage so the page behaves end to end without a server.
import { reactive } from 'vue'
import { authEnabled, updatePassword } from './auth'

const KEY = 'jawabin-mock'
const VERSION = 3
export const API_BASE = 'https://api.jawabin.example'
const wait = (ms = 450) => new Promise((resolve) => setTimeout(resolve, ms))

function seedUsage() {
  const samples = [
    ['content', 'Harganya berapa kak?', 'Halo kak! Harganya Rp149.000, sudah termasuk ongkir se-Jawa ya 😊', 412],
    ['chat', 'Buka sampai jam berapa hari ini?', 'Hari ini kami buka sampai pukul 21.00 WIB kak.', 286],
    ['content', 'Ready stok warna hitam?', 'Ready kak, warna hitam tersedia ukuran M sampai XL.', 351],
    ['validate', 'ping', 'pong', 12],
    ['content', 'Bisa COD?', 'Bisa kak, COD tersedia untuk seluruh Indonesia.', 298],
    ['chat', 'Kirim katalognya dong', 'Siap kak, katalog lengkapnya sudah kami kirim lewat DM ya.', 334],
    ['content', 'Cek bit.ly/promo-murah', '', 97],
    ['content', 'Ada garansi?', 'Ada kak, garansi resmi 12 bulan untuk semua produk.', 305],
  ]
  const docs = []
  for (let i = 0; i < 46; i++) {
    const [type, input, output, token] = samples[i % samples.length]
    docs.push({
      _id: `usage-${i}`,
      type,
      token: token + ((i * 37) % 60),
      createdAt: new Date(Date.now() - i * 5.3 * 3600 * 1000 - 120000).toISOString(),
      data: JSON.stringify({
        request: { contents: [{ parts: [{ text: input }] }] },
        response: {
          candidates: output ? [{ content: { parts: [{ text: output }] } }] : [],
          modelVersion: 'gemini-3.5-flash',
        },
      }),
    })
  }
  return docs
}

function randomId(length) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function seedWebhookLogs() {
  const url = 'https://toko.example.com/hooks/jawabin'
  const payloads = [
    { platform: 'instagram', type: 'comment', accountId: 'acc_001', data: { status: 'pending', comment: { text: 'Harganya berapa kak?' } } },
    { platform: 'jawabin', type: 'schedule', accountId: 'acc_001', data: { id: 'sch_104', status: 'success' } },
    { platform: 'tiktok', type: 'comment', accountId: 'acc_002', data: { status: 'resolved', comment: { text: 'Ready stok?' } } },
    { platform: 'instagram', type: 'chat', accountId: 'acc_001', data: { message: { text: 'Bisa COD?' } } },
  ]
  return Array.from({ length: 27 }, (_, i) => ({
    _id: `wh-${i}`,
    url,
    status: i % 6 == 2 ? 'error' : 'success',
    errorMessage: i % 6 == 2 ? 'Request failed with status code 500' : '',
    createdAt: hoursAgo(i * 3.1 + 0.2),
    data: JSON.stringify(payloads[i % payloads.length]),
  }))
}

function seedActivities() {
  const agent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36'
  const owner = { type: 'owner', name: 'Pengguna Demo', email: 'demo@example.com' }
  const operator = { type: 'operator', name: 'Rina', email: 'rina@example.com' }
  const events = [
    { module: 'auth', action: 'login', detail: { method: 'google' }, actor: owner, source: 'web' },
    { module: 'comment', action: 'reply', target: { label: 'Harganya berapa kak?' }, detail: { text: 'Rp149.000 kak' }, actor: operator, source: 'web' },
    { module: 'account', action: 'connect', detail: { platform: 'Instagram' }, actor: owner, source: 'web' },
    { module: 'chat', action: 'send_message', target: { label: 'Budi' }, actor: operator, source: 'api', method: 'POST', path: '/public/chat/send' },
    { module: 'auth', action: 'login_failed', detail: { method: 'password' }, actor: owner, source: 'web', status: 'failed', errorMessage: 'invalid password' },
    { module: 'contact', action: 'update', target: { label: 'Siti' }, detail: { stage: 'lead', tags: 'vip' }, actor: owner, source: 'ai_assistant' },
    { module: 'comment', action: 'delete', target: { label: 'Cek bit.ly/promo-murah' }, actor: operator, source: 'web' },
    { module: 'auth', action: 'logout', actor: operator, source: 'web' },
  ]
  return Array.from({ length: 68 }, (_, i) => ({
    _id: `act-${i}`,
    status: 'success',
    ...events[i % events.length],
    operatorId: events[i % events.length].actor.type == 'operator' ? 'o1' : '',
    userAgent: agent,
    ip: `203.0.113.${(i * 7) % 250 + 1}`,
    createdAt: hoursAgo(i * 4.7 + 0.1),
  }))
}

const hoursAgo = (h) => new Date(Date.now() - h * 3600 * 1000).toISOString()

function seed() {
  return {
    version: VERSION,
    plan: 'gold',
    expiredAt: new Date(Date.now() + 23 * 86400 * 1000).toISOString(),
    ai: { type: 'gemini', url: '', model: 'gemini-3.5-flash', token: '', isProvided: false, balance: 125000 },
    usage: seedUsage(),
    notification: { affiliate: true, expired: true, transaction: true, account: false },
    twoFactor: { isActive: false },
    tikwm: { apiKey: '' },
    phone: '',
    addon: { account: 5, operator: 2, storage: 10, twitter: 0 },
    api: { accessKey: 'jwb_access_' + randomId(16), secretKey: 'jwb_secret_' + randomId(32) },
    webhooks: [{ url: 'https://toko.example.com/hooks/jawabin', token: 'rahasia-toko' }],
    webhookLogs: seedWebhookLogs(),
    activities: seedActivities(),
    apps: [
      {
        _id: 'a1', name: 'Toko Dashboard', description: 'Dasbor internal untuk memantau komentar toko.', website: 'https://toko.example.com', logo: '',
        type: 'confidential', isVerified: false, isDisabled: false, clientId: 'jwb_client_' + randomId(16), clientSecretHint: 'k3f9',
        redirectUris: ['https://toko.example.com/callback'],
      },
    ],
    sessions: [
      { _id: 's1', token: 'current', updatedAt: hoursAgo(0.02), userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36' },
      { _id: 's2', token: 'b', updatedAt: hoursAgo(5), userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 19_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/19.1 Mobile/15E148 Safari/604.1' },
      { _id: 's3', token: 'c', updatedAt: hoursAgo(30), userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0', operator: { _id: 'o1', name: 'Rina' } },
      { _id: 's4', token: 'd', updatedAt: hoursAgo(74), userAgent: 'Mozilla/5.0 (Linux; Android 16; Pixel 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Mobile Safari/537.36' },
    ],
    connectedApps: [
      { _id: 'c1', lastUsedAt: hoursAgo(2), scopes: ['profile:read', 'comment:read', 'comment:write'], app: { name: 'Toko Dashboard', website: 'https://toko.example.com', isVerified: true } },
      { _id: 'c2', lastUsedAt: hoursAgo(120), scopes: ['profile:read', 'report:read', 'schedule:write'], app: { name: 'Sheet Sync', website: 'https://sheets.example.org', isVerified: false }, operator: { _id: 'o1', name: 'Rina' } },
    ],
    transactions: [
      { identifierId: 'INV-20261112-0931', type: 'plan', plan: 'gold', month: 1, amount: 299000, status: 'unpaid', createdAt: hoursAgo(0.3), url: '#pay' },
      { identifierId: 'INV-20261020-0412', type: 'token', month: 500000, amount: 75000, status: 'paid', createdAt: hoursAgo(24 * 23) },
      { identifierId: 'INV-20261012-0388', type: 'plan', plan: 'gold', month: 1, amount: 269100, status: 'paid', createdAt: hoursAgo(24 * 31), coupon: { code: 'HEMAT10', value: 10 } },
      { identifierId: 'INV-20260930-0290', type: 'addon', plan: 'account', month: 5, amount: 125000, status: 'paid', createdAt: hoursAgo(24 * 43) },
      { identifierId: 'INV-20260912-0201', type: 'plan', plan: 'silver', month: 3, amount: 447000, status: 'canceled', createdAt: hoursAgo(24 * 61) },
      { identifierId: 'INV-20260910-0177', type: 'addon', plan: 'storage', month: 10, amount: 50000, status: 'paid', createdAt: hoursAgo(24 * 63) },
    ],
  }
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    if (saved?.version == VERSION) return saved
  } catch {}
  return seed()
}

const db = load()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {}
}

function snapshot() {
  return {
    ai: { ...db.ai },
    notification: { ...db.notification },
    twoFactor: { ...db.twoFactor },
    tikwm: { ...db.tikwm },
    api: { ...db.api },
    webhooks: db.webhooks.map((hook) => ({ ...hook })),
  }
}

export const user = reactive({
  name: 'Pengguna Demo',
  email: 'demo@example.com',
  plan: db.plan,
  expiredAt: db.expiredAt,
  phone: db.phone,
  addon: { ...db.addon },
  config: snapshot(),
})

function sync() {
  persist()
  user.plan = db.plan
  user.expiredAt = db.expiredAt
  user.phone = db.phone
  user.config = snapshot()
}

function paginate(list, page = 1, limit = 20) {
  const totalPages = Math.max(1, Math.ceil(list.length / limit))
  const current = Math.min(page, totalPages)
  return { data: { docs: list.slice((current - 1) * limit, current * limit).map((doc) => ({ ...doc })), page: current, totalPages } }
}

export async function updateNotification(values) {
  await wait(300)
  db.notification = { ...values }
  sync()
}

export async function getSessions({ page, limit }) {
  await wait()
  return paginate(db.sessions.map((s) => ({ ...s, isCurrent: s.token == 'current' })), page, limit)
}

export async function removeSession(id) {
  await wait()
  db.sessions = db.sessions.filter((s) => s._id != id)
  sync()
}

export async function getConnectedApps({ page, limit }) {
  await wait()
  return paginate(db.connectedApps, page, limit)
}

export async function removeConnectedApp(id) {
  await wait()
  db.connectedApps = db.connectedApps.filter((a) => a._id != id)
  sync()
}

export async function generateTwoFactor() {
  await wait()
  // Placeholder image: a real backend returns a scannable otpauth:// QR code.
  const cells = Array.from({ length: 21 * 21 }, (_, i) => ((i * 7919 + Math.floor(Math.random() * 9973)) % 3 == 0 ? 1 : 0))
  const rects = cells.map((on, i) => (on ? `<rect x="${i % 21}" y="${Math.floor(i / 21)}" width="1" height="1"/>` : '')).join('')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 21" shape-rendering="crispEdges">${rects}</svg>`
  return { data: { qrcode: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}` } }
}

export async function verifyTwoFactor(code) {
  await wait()
  if (!/^\d{6}$/.test(code)) throw new Error('invalid code')
  db.twoFactor.isActive = true
  sync()
}

export async function removeTwoFactor() {
  await wait()
  db.twoFactor.isActive = false
  sync()
}

export async function updateTikwm(apiKey) {
  await wait()
  db.tikwm.apiKey = apiKey
  sync()
}

export async function getTransactions({ page, limit, search }) {
  await wait()
  const term = String(search || '').trim().toLowerCase()
  return paginate(db.transactions.filter((tx) => !term || tx.identifierId.toLowerCase().includes(term)), page, limit)
}

export async function redeemCode(code) {
  await wait(700)
  if (code != 'JAWABIN30') throw new Error(code == 'USED' ? 'code has used' : 'invalid code')
  db.plan = 'premium'
  db.expiredAt = new Date(Date.now() + 30 * 86400 * 1000).toISOString()
  sync()
  return { data: { plan: db.plan, expiredAt: db.expiredAt } }
}

export async function updateAi({ type, url, model, token, isProvided }) {
  await wait(700)
  if (!isProvided && !token) throw new Error('API key is required')
  if (!isProvided && !model) throw new Error('Model is required')
  Object.assign(db.ai, { type, url, model, token, isProvided })
  if (!isProvided) {
    // The real backend sends one test request on save; mirror that in the history.
    db.usage.unshift({
      _id: `usage-${Date.now()}`,
      type: 'validate',
      token: 12,
      createdAt: new Date().toISOString(),
      data: JSON.stringify({
        request: { messages: [{ role: 'user', content: 'ping' }] },
        response: { choices: [{ message: { content: 'pong' } }], model },
      }),
    })
  }
  sync()
}

export async function getUsageSummary() {
  await wait()
  const data = { total: 0, content: 0, chat: 0, validate: 0 }
  for (const doc of db.usage) {
    data[doc.type] += doc.token
    data.total += doc.token
  }
  return { data }
}

export async function getUsage(page = 1, limit = 20) {
  await wait()
  const totalPages = Math.max(1, Math.ceil(db.usage.length / limit))
  const current = Math.min(page, totalPages)
  return { data: { docs: db.usage.slice((current - 1) * limit, current * limit), page: current, totalPages } }
}

export async function resetApiKeys() {
  await wait()
  db.api.secretKey = 'jwb_secret_' + randomId(32)
  sync()
}

export async function updateWebhooks(webhooks) {
  await wait(700)
  for (const hook of webhooks) {
    if (!/^https?:\/\//.test(hook.url)) throw new Error(`invalid url: ${hook.url}`)
  }
  db.webhooks = webhooks.map((hook) => ({ ...hook }))
  sync()
  return db.webhooks.map((hook) => ({ ...hook }))
}

export async function getWebhookLogs(page, limit, url = '') {
  await wait()
  return paginate(db.webhookLogs.filter((log) => !url || log.url == url), page, limit)
}

export async function retryWebhook(id) {
  await wait(800)
  const log = db.webhookLogs.find((item) => item._id == id)
  if (log) Object.assign(log, { status: 'success', errorMessage: '' })
  sync()
}

export async function getOperators() {
  await wait(200)
  return { data: { docs: [{ _id: 'o1', name: 'Rina' }] } }
}

export async function getActivities({ page, limit, operatorId, module, source, status, fromDate }) {
  await wait()
  const list = db.activities.filter(
    (doc) =>
      (!operatorId || (operatorId == 'owner' ? !doc.operatorId : doc.operatorId == operatorId)) &&
      (!module || doc.module == module) &&
      (!source || doc.source == source) &&
      (!status || doc.status == status) &&
      (!fromDate || doc.createdAt >= fromDate),
  )
  return paginate(list, page, limit)
}

export async function sendPhoneCode(phone) {
  await wait(700)
  if (!/^\d{8,15}$/.test(phone)) throw new Error('invalid phone number')
  db.pendingPhone = phone
}

export async function verifyPhoneCode(code) {
  await wait(700)
  if (!/^\d{6}$/.test(code)) throw new Error('invalid code')
  db.phone = db.pendingPhone
  sync()
}

export async function changePassword(password) {
  if (password.length < 8) throw new Error('password must be at least 8 characters')
  if (authEnabled) return updatePassword(password)
  await wait(700)
}

export async function getApps() {
  await wait()
  return { data: db.apps.map((app) => ({ ...app, redirectUris: [...app.redirectUris] })) }
}

function newSecret(app) {
  const secret = 'jwb_secret_' + randomId(32)
  app.clientSecretHint = secret.slice(-4)
  return secret
}

export async function createApp(values) {
  await wait(700)
  const app = { _id: `a${Date.now()}`, isVerified: false, isDisabled: false, clientId: 'jwb_client_' + randomId(16), clientSecretHint: '', ...values }
  const clientSecret = app.type == 'confidential' ? newSecret(app) : null
  db.apps.push(app)
  sync()
  return { data: { ...app, clientSecret } }
}

export async function updateApp(id, values) {
  await wait(700)
  const app = db.apps.find((item) => item._id == id)
  Object.assign(app, values)
  sync()
  return { data: { ...app } }
}

export async function rotateAppSecret(id) {
  await wait(700)
  const clientSecret = newSecret(db.apps.find((item) => item._id == id))
  sync()
  return { data: { clientSecret } }
}

export async function removeApp(id) {
  await wait()
  db.apps = db.apps.filter((item) => item._id != id)
  sync()
}
