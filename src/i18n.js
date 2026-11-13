import { ref } from 'vue'

const BRAND = 'Jawabin'

const messages = {
  en: {
    feature: {
      menu: {
        dashboard: 'Dashboard', assistant: 'AI Assistant', report: 'Report', comment: 'Comment',
        conversation: 'Conversation', contact: 'Contacts', liveContent: 'Live Content',
        automation: 'Automation Content', schedule: 'Schedule Content', template: 'Automation Template',
        account: 'Account Integration', operator: 'Operator Account', contentTikTok: 'Content TikTok',
        contentThreads: 'Content Threads', storage: 'Storage', affiliate: 'Affiliate', setting: 'Setting',
      },
      title: { inbox: 'Inbox', research: 'Research', account: 'Account', content: 'Content', automation: 'Automation' },
      sidebar: { collapse: 'Collapse sidebar', expand: 'Expand sidebar', theme: 'Dark mode', language: 'Language', more: 'More' },
      soon: 'This page is not built yet.',
    },
    setting: {
      menu: {
        profile: 'Profile', session: 'Session', twofactor: '2FA', transaction: 'Transaction',
        notification: 'Notification', ai: 'AI', api: 'Public API', webhook: 'Webhook', tikwm: 'TikWM Key',
        redeem: 'Redeem', activity: 'Activity Log', connected_app: 'Connected Apps', developer: 'Developer',
      },
      link: { tutorial: 'Tutorial', documentation: 'Documentation', customerService: 'Customer Service', community: 'Community', changelog: 'Changelog' },
      back: 'Back to settings',
      pick: 'Pick a setting on the left.',
      group: { account: 'Account', preference: 'Preferences', integration: 'Integrations', help: 'Help' },
      hint: { ai: `Your own AI API key or ${BRAND} tokens` },
    },
    ai: {
      title: 'AI',
      form: {
        source: 'Source',
        sourceHint: 'Where AI replies, AI filters and AI captions get their answers.',
        own: { title: 'Your own API key', subtitle: 'Pay the provider directly. Gemini, OpenAI, DeepSeek and more.' },
        provided: { title: `${BRAND} tokens`, subtitle: `No key needed. Buy tokens from ${BRAND}, it runs on Gemini.` },
        key: 'API key',
        alert: `Tokens only work on ${BRAND} and don't add balance to OpenAI or other platforms.`,
        empty: 'When the balance reaches 0, AI replies and filters stop until you buy more.',
        balance: 'Balance', tokens: '{n} tokens', buy: 'Buy tokens', platform: 'Provider', model: 'Model', endpoint: 'Endpoint',
        placeholder: { key: 'Paste your API key', model: 'Type a model name or pick one below', endpoint: 'https://…' },
        getApiKey: 'Open your {provider} keys', show: 'Show key', hide: 'Hide key',
        test: 'Saving sends one short test request with this key and model. It uses a few tokens and shows up in the history.',
        toast: 'AI settings saved', button: 'Save',
      },
      summary: {
        title: 'Tokens used', subtitle: 'All time, across every AI feature.', total: 'Total',
        validate: 'Key checks', content: 'Replies, filters and captions', chat: 'Chat replies',
      },
      history: {
        title: 'Usage history', subtitle: 'Each AI request and the tokens it used.', empty: 'No AI requests yet',
        tokens: '{n} tokens', input: 'Input', output: 'Output', raw: 'Raw response', copy: 'Copy JSON',
        copied: 'JSON copied', model: 'Model', none: 'No text in this response',
      },
    },
  },
  id: {
    feature: {
      menu: {
        dashboard: 'Dashboard', assistant: 'Asisten AI', report: 'Laporan', comment: 'Komentar',
        conversation: 'Percakapan', contact: 'Kontak', liveContent: 'Konten Live', automation: 'Konten Automasi',
        schedule: 'Konten Terjadwal', template: 'Template Automasi', account: 'Integrasi Akun',
        operator: 'Akun Operator', contentTikTok: 'Konten TikTok', contentThreads: 'Konten Threads',
        storage: 'Storage', affiliate: 'Affiliate', setting: 'Pengaturan',
      },
      title: { inbox: 'Kotak Masuk', research: 'Riset', account: 'Akun', content: 'Konten', automation: 'Automasi' },
      sidebar: { collapse: 'Ciutkan sidebar', expand: 'Lebarkan sidebar', theme: 'Mode gelap', language: 'Bahasa', more: 'Lainnya' },
      soon: 'Halaman ini belum dibuat.',
    },
    setting: {
      menu: {
        profile: 'Profil', session: 'Sesi', twofactor: '2FA', transaction: 'Transaksi', notification: 'Notifikasi',
        ai: 'AI', api: 'API Publik', webhook: 'Webhook', tikwm: 'Key TikWM', redeem: 'Redeem',
        activity: 'Log Aktivitas', connected_app: 'Aplikasi Terhubung', developer: 'Developer',
      },
      link: { tutorial: 'Tutorial', documentation: 'Dokumentasi', customerService: 'Customer Service', community: 'Komunitas', changelog: 'Changelog' },
      back: 'Kembali ke pengaturan',
      pick: 'Pilih pengaturan di sebelah kiri.',
      group: { account: 'Akun', preference: 'Preferensi', integration: 'Integrasi', help: 'Bantuan' },
      hint: { ai: `API key AI sendiri atau token ${BRAND}` },
    },
    ai: {
      title: 'AI',
      form: {
        source: 'Sumber',
        sourceHint: 'Tempat balasan AI, filter AI dan deskripsi AI mendapat jawabannya.',
        own: { title: 'API key sendiri', subtitle: 'Bayar langsung ke penyedianya. Gemini, OpenAI, DeepSeek dan lainnya.' },
        provided: { title: `Token ${BRAND}`, subtitle: `Tanpa key. Beli token dari ${BRAND}, berjalan di Gemini.` },
        key: 'API key',
        alert: `Token hanya berlaku di ${BRAND} dan tidak menambah saldo OpenAI atau platform lain.`,
        empty: 'Saat saldo habis, balasan dan filter AI berhenti sampai kamu membeli lagi.',
        balance: 'Saldo', tokens: '{n} token', buy: 'Beli token', platform: 'Penyedia', model: 'Model', endpoint: 'Endpoint',
        placeholder: { key: 'Tempel API key kamu', model: 'Ketik nama model atau pilih di bawah', endpoint: 'https://…' },
        getApiKey: 'Buka key {provider}', show: 'Tampilkan key', hide: 'Sembunyikan key',
        test: `Saat disimpan, ${BRAND} mengirim satu request uji dengan key dan model ini. Ini memakai sedikit token dan muncul di riwayat.`,
        toast: 'Pengaturan AI tersimpan', button: 'Simpan',
      },
      summary: {
        title: 'Token terpakai', subtitle: 'Sejak awal, dari semua fitur AI.', total: 'Total',
        validate: 'Cek key', content: 'Balasan, filter dan deskripsi', chat: 'Balasan chat',
      },
      history: {
        title: 'Riwayat penggunaan', subtitle: 'Setiap request AI dan token yang dipakai.', empty: 'Belum ada request AI',
        tokens: '{n} token', input: 'Input', output: 'Output', raw: 'Respons mentah', copy: 'Salin JSON',
        copied: 'JSON tersalin', model: 'Model', none: 'Tidak ada teks di respons ini',
      },
    },
  },
}

function stored(key, fallback) {
  try {
    return localStorage.getItem(key) || fallback
  } catch {
    return fallback
  }
}

export const locale = ref(stored('locale', 'id'))

export function setLocale(value) {
  locale.value = value
  document.documentElement.lang = value
  try {
    localStorage.setItem('locale', value)
  } catch {}
}

export function t(path, params = {}) {
  const found = path.split('.').reduce((node, part) => node?.[part], messages[locale.value])
  if (typeof found != 'string') return path
  return found.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? '')
}

export function formatNumber(value) {
  return new Intl.NumberFormat(locale.value == 'id' ? 'id-ID' : 'en-US').format(value || 0)
}

export function formatRelative(date) {
  const diff = (new Date(date).getTime() - Date.now()) / 1000
  const formatter = new Intl.RelativeTimeFormat(locale.value, { numeric: 'auto', style: 'short' })
  const units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]]
  for (const [unit, seconds] of units) {
    if (Math.abs(diff) >= seconds) return formatter.format(Math.round(diff / seconds), unit)
  }
  return formatter.format(Math.round(diff), 'second')
}

export function formatDate(date) {
  const d = new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
