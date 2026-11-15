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
    danger: {
      title: 'Delete account', hint: 'Removes your Jawabin account and everything stored for it: connected Instagram accounts and their access tokens, comments, messages, rules, AI settings and history. This cannot be undone.',
      button: 'Delete account', modal: 'Delete your account?', label: 'Type {email} to confirm', mismatch: 'That does not match your account email',
      confirm: 'Delete permanently', cancel: 'Cancel', toast: 'Your account and data were deleted',
    },
    account: {
      title: 'Account Integration', hint: 'The social accounts Jawabin reads comments from', connect: 'Connect Instagram',
      note: 'Only Instagram professional accounts (Business or Creator) can be connected.',
      empty: { title: 'No accounts yet', message: 'Connect an Instagram account to start receiving its comments here.' },
      since: 'Connected {time}', remove: 'Disconnect',
      alert: { title: 'Disconnect this account?', message: 'Comments from @{name} stop coming in, and its stored comments are deleted.' },
      toast: { connected: '@{name} connected', removed: 'Account disconnected' },
    },
    comment: {
      title: 'Comment', hint: 'Comments from your connected accounts',
      filter: { all: 'All', pending: 'Pending', resolved: 'Replied', ignored: 'Ignored' },
      empty: 'No comments here', reply: 'Reply', placeholder: 'Write a reply…', send: 'Send', ignore: 'Ignore', reopen: 'Reopen',
      by: { rule: 'Replied by a rule', ai: 'Replied by AI', manual: 'Replied by you' },
      failed: 'Auto-reply failed: {message}', toast: 'Reply sent',
    },
    dashboard: {
      title: 'Dashboard', hint: 'How your comments are doing over the last 7 days',
      needsReply: 'Needs reply',
      card: {
        today: 'Comments today', todayHint: 'Comments received since midnight',
        week: 'Comments this week', weekHint: 'The last seven days, today included',
        pending: 'Waiting for a reply', pendingHint: 'Open the comment inbox to answer them',
        auto: 'Answered automatically', autoHint: '{auto} of {replied} replies came from a rule or AI',
        tokens: 'AI tokens this week', tokensHint: '{total} tokens used all time',
        accounts: 'Connected accounts', accountsHint: 'Instagram accounts that feed comments',
      },
      empty: { title: 'No account connected yet', message: 'Connect an Instagram account so comments start arriving.' },
      rangeNote: 'Counted over the last {days} days.',
      loadFailed: 'Could not load the numbers.',
      retry: 'Try again',
    },
    chat: {
      title: 'Conversation', hint: 'Direct messages from your connected accounts',
      empty: 'No conversations yet', pick: 'Pick a conversation to read it',
      closed: 'Window closed', windowClosed: 'The 24-hour reply window has closed. You can still read this conversation.',
      placeholder: 'Write a message…', send: 'Send', sending: 'Sending…', back: 'All conversations',
      by: { rule: 'Sent by a rule', ai: 'Sent by AI', manual: 'Sent by you' },
      failed: 'Not delivered: {message}', toast: 'Message sent',
    },
    automation: {
      title: 'Automation', hint: 'Rules that reply to comments for you', create: 'New rule',
      order: 'Keyword rules are checked first. An AI rule answers any comment no keyword rule matched.',
      empty: { title: 'No rules yet', message: 'Add a rule to reply automatically when a comment contains a keyword, or let AI answer.' },
      type: { keyword: 'Keyword', ai: 'AI' }, all: 'All accounts', active: 'Active', edit: 'Edit', remove: 'Delete',
      channel: { comment: 'Comments', chat: 'Direct messages', both: 'Comments and DMs' },
      form: {
        create: 'New Rule', edit: 'Edit Rule', name: 'Name', namePlaceholder: 'Price question', kind: 'Reply with', account: 'Account',
        channel: 'Reply to', channelHint: 'Direct messages can only be answered inside the 24-hour reply window.',
        keywords: 'Keywords', keywordsHint: 'Separate with commas. The rule runs when a comment contains any of them.',
        reply: 'Reply', prompt: 'Instructions for AI', promptHint: 'Facts and tone the AI should use: opening hours, prices, policies.',
        required: 'Fill in every field', save: 'Save', cancel: 'Cancel',
      },
      alert: { title: 'Delete this rule?', message: '“{name}” stops replying right away.' },
      toast: { saved: 'Rule saved', removed: 'Rule deleted' },
    },
    auth: {
      login: { title: 'Sign in to your account', button: 'Sign In', switch: 'Don’t have an account?', action: 'Sign up' },
      register: { title: 'Create your account', button: 'Sign Up', switch: 'Already have an account?', action: 'Sign in' },
      subtitle: 'Manage your comments more efficiently',
      name: 'Name', email: 'Email', password: 'Password', passwordHint: 'At least 8 characters',
      or: 'or', google: 'Continue with Google', logout: 'Sign out',
      confirm: 'Check your email and open the confirmation link, then sign in.',
      required: 'Fill in every field', short: 'Password must be at least 8 characters',
    },
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
    danger: {
      title: 'Hapus akun', hint: 'Menghapus akun Jawabin kamu beserta semua yang tersimpan: akun Instagram yang terhubung dan token aksesnya, komentar, pesan, aturan, pengaturan AI, dan riwayat. Tidak bisa dibatalkan.',
      button: 'Hapus akun', modal: 'Hapus akunmu?', label: 'Ketik {email} untuk konfirmasi', mismatch: 'Tidak cocok dengan email akunmu',
      confirm: 'Hapus permanen', cancel: 'Batal', toast: 'Akun dan datamu sudah dihapus',
    },
    account: {
      title: 'Integrasi Akun', hint: 'Akun media sosial yang komentarnya dibaca Jawabin', connect: 'Hubungkan Instagram',
      note: 'Hanya akun Instagram profesional (Bisnis atau Kreator) yang bisa dihubungkan.',
      empty: { title: 'Belum ada akun', message: 'Hubungkan akun Instagram supaya komentarnya mulai masuk ke sini.' },
      since: 'Terhubung {time}', remove: 'Putuskan',
      alert: { title: 'Putuskan akun ini?', message: 'Komentar dari @{name} berhenti masuk, dan komentar yang tersimpan ikut dihapus.' },
      toast: { connected: '@{name} terhubung', removed: 'Akun diputuskan' },
    },
    comment: {
      title: 'Komentar', hint: 'Komentar dari akun yang terhubung',
      filter: { all: 'Semua', pending: 'Belum dibalas', resolved: 'Sudah dibalas', ignored: 'Diabaikan' },
      empty: 'Tidak ada komentar', reply: 'Balas', placeholder: 'Tulis balasan…', send: 'Kirim', ignore: 'Abaikan', reopen: 'Buka lagi',
      by: { rule: 'Dibalas oleh aturan', ai: 'Dibalas oleh AI', manual: 'Dibalas olehmu' },
      failed: 'Balasan otomatis gagal: {message}', toast: 'Balasan terkirim',
    },
    dashboard: {
      title: 'Dashboard', hint: 'Kondisi komentar kamu dalam 7 hari terakhir',
      needsReply: 'Perlu dibalas',
      card: {
        today: 'Komentar hari ini', todayHint: 'Komentar masuk sejak tengah malam',
        week: 'Komentar 7 hari', weekHint: 'Tujuh hari terakhir, termasuk hari ini',
        pending: 'Menunggu balasan', pendingHint: 'Buka kotak masuk komentar untuk membalas',
        auto: 'Terbalas otomatis', autoHint: '{auto} dari {replied} balasan berasal dari aturan atau AI',
        tokens: 'Token AI minggu ini', tokensHint: '{total} token terpakai sepanjang waktu',
        accounts: 'Akun terhubung', accountsHint: 'Akun Instagram sumber komentar',
      },
      empty: { title: 'Belum ada akun terhubung', message: 'Hubungkan akun Instagram supaya komentar mulai masuk.' },
      rangeNote: 'Dihitung dari {days} hari terakhir.',
      loadFailed: 'Angka gagal dimuat.',
      retry: 'Coba lagi',
    },
    chat: {
      title: 'Percakapan', hint: 'Pesan langsung dari akun yang terhubung',
      empty: 'Belum ada percakapan', pick: 'Pilih percakapan untuk membacanya',
      closed: 'Jendela tutup', windowClosed: 'Jendela balas 24 jam sudah tutup. Percakapan tetap bisa dibaca.',
      placeholder: 'Tulis pesan…', send: 'Kirim', sending: 'Mengirim…', back: 'Semua percakapan',
      by: { rule: 'Dikirim oleh aturan', ai: 'Dikirim oleh AI', manual: 'Dikirim olehmu' },
      failed: 'Gagal terkirim: {message}', toast: 'Pesan terkirim',
    },
    automation: {
      title: 'Automasi', hint: 'Aturan yang membalas komentar untukmu', create: 'Aturan baru',
      order: 'Aturan kata kunci dicek lebih dulu. Aturan AI menjawab komentar yang tidak cocok dengan kata kunci mana pun.',
      empty: { title: 'Belum ada aturan', message: 'Tambahkan aturan untuk membalas otomatis saat komentar memuat kata kunci, atau biarkan AI yang menjawab.' },
      type: { keyword: 'Kata kunci', ai: 'AI' }, all: 'Semua akun', active: 'Aktif', edit: 'Ubah', remove: 'Hapus',
      channel: { comment: 'Komentar', chat: 'Pesan langsung', both: 'Komentar dan DM' },
      form: {
        create: 'Aturan Baru', edit: 'Ubah Aturan', name: 'Nama', namePlaceholder: 'Tanya harga', kind: 'Balas dengan', account: 'Akun',
        channel: 'Balas di', channelHint: 'Pesan langsung hanya bisa dibalas dalam jendela 24 jam.',
        keywords: 'Kata kunci', keywordsHint: 'Pisahkan dengan koma. Aturan jalan saat komentar memuat salah satunya.',
        reply: 'Balasan', prompt: 'Instruksi untuk AI', promptHint: 'Fakta dan gaya yang dipakai AI: jam buka, harga, kebijakan.',
        required: 'Isi semua kolom', save: 'Simpan', cancel: 'Batal',
      },
      alert: { title: 'Hapus aturan ini?', message: '“{name}” langsung berhenti membalas.' },
      toast: { saved: 'Aturan tersimpan', removed: 'Aturan dihapus' },
    },
    auth: {
      login: { title: 'Masuk ke akunmu', button: 'Masuk', switch: 'Belum punya akun?', action: 'Daftar' },
      register: { title: 'Buat akunmu', button: 'Daftar', switch: 'Sudah punya akun?', action: 'Masuk' },
      subtitle: 'Kelola komentar dengan lebih efisien',
      name: 'Nama', email: 'Email', password: 'Password', passwordHint: 'Minimal 8 karakter',
      or: 'atau', google: 'Lanjutkan dengan Google', logout: 'Keluar',
      confirm: 'Cek email kamu dan buka link konfirmasinya, lalu masuk.',
      required: 'Isi semua kolom', short: 'Password minimal 8 karakter',
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
