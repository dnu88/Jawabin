// Mock backend. Same call shapes as the real API will need:
//   PUT /ai                 -> updateAi
//   GET /ai/usage/summary   -> getUsageSummary
//   GET /ai/usage           -> getUsage
// State lives in localStorage so the page behaves end to end without a server.
import { reactive } from 'vue'

const KEY = 'jawabin-mock'
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

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    if (saved?.ai && saved?.usage) return saved
  } catch {}
  return {
    ai: { type: 'gemini', url: '', model: 'gemini-3.5-flash', token: '', isProvided: false, balance: 125000 },
    usage: seedUsage(),
  }
}

const db = load()

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(db))
  } catch {}
}

export const user = reactive({
  name: 'Pengguna Demo',
  email: 'demo@example.com',
  config: { ai: { ...db.ai } },
})

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
  persist()
  user.config.ai = { ...db.ai }
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
