import { ref } from 'vue'
import en from './locales/en.json'
import id from './locales/id.json'

const messages = {
  en: {
    ...en,
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
    common: { cancel: 'Cancel', confirm: 'Confirm', close: 'Close' },
  },
  id: {
    ...id,
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
    common: { cancel: 'Batal', confirm: 'Ya, lanjutkan', close: 'Tutup' },
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

function lookup(path) {
  const found = path.split('.').reduce((node, part) => node?.[part], messages[locale.value])
  return typeof found == 'string' ? found : null
}

// `count` picks a plural form from "one | many" messages.
export function t(path, params = {}, count) {
  let found = lookup(path)
  if (found == null) return path
  if (found.includes(' | ')) {
    const forms = found.split(' | ')
    found = count == 1 ? forms[0] : forms[forms.length - 1]
  }
  return found.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? '')
}

// Splits a message around one placeholder so a component can render in its place.
export function tSplit(path, name) {
  const [before, after = ''] = (lookup(path) ?? path).split(`{${name}}`)
  return { before, after }
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

export function formatDay(date) {
  return new Intl.DateTimeFormat(locale.value == 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}

export function formatTime(date) {
  const d = new Date(date)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function formatRupiah(value) {
  return `Rp${new Intl.NumberFormat('id-ID').format(value || 0)}`
}

export function capitalize(value) {
  return String(value || '').replace(/^./, (c) => c.toUpperCase())
}

export function te(path) {
  return lookup(path) != null
}

export function formatDayLong(date) {
  return new Intl.DateTimeFormat(locale.value == 'id' ? 'id-ID' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(date))
}
