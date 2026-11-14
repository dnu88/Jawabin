# Jawabin — kondisi sekarang dan rencana lanjutan

Dokumen serah-terima untuk siapa pun (orang atau agen) yang meneruskan proyek ini.
Langkah setting platform ada di [`SETUP.md`](SETUP.md); dokumen ini tidak mengulangnya.

## Ringkasan

Jawabin adalah aplikasi web untuk mengelola dan membalas komentar media sosial secara otomatis.
Tampilan dan teksnya direkonstruksi dari bundle publik Repliz (`repliz.com`), dengan merek diganti menjadi Jawabin.

Alur inti sudah ditulis ujung ke ujung: **login → hubungkan Instagram → komentar masuk → dibalas aturan atau AI**.
Alur itu **belum pernah dijalankan terhadap layanan sungguhan** (Supabase, Meta, penyedia AI), karena kredensialnya belum ada.

- Repo: `dnu88/Jawabin`. Branch default sekaligus branch kerja: `claude/elegant-hamilton-vormhk`. Tidak ada `main`.
- Deploy: Vercel, otomatis setiap push ke branch itu.
- Tanpa environment variable Supabase, aplikasi berjalan dalam **mode demo**: tanpa login, data tiruan di `localStorage`.

## Stack

| Bagian | Teknologi |
| --- | --- |
| Tampilan | Vue 3 (`<script setup>`), Vite 7, vue-router 4, Tailwind 4, daisyUI 5, `@iconify/vue` (ikon `mingcute:*`) |
| Server | Satu Vercel Function Node.js (`api/index.js`), handler gaya Web (`Request` → `Response`) |
| Database dan login | Supabase (Postgres + Auth) |
| Bahasa antarmuka | Indonesia (default) dan Inggris |

## Peta kode

```
api/index.js              Router semua rute /api/*. Ekspor GET/POST/PUT/DELETE.
server/
  http.js                 HttpError, json(), redirect(), env(), pagination
  db.js                   Klien Supabase service-role, requireUser() (cek JWT)
  crypto.js               AES-256-GCM, HMAC, state OAuth bertanda tangan
  ai.js                   generate() untuk Gemini, Anthropic, dan penyedia kompatibel OpenAI
  instagram.js            OAuth, token 60 hari + perpanjangan, balas komentar
  autoreply.js            matchRule() dan autoReply()
  routes/                 ai, accounts, comments, rules, webhook
supabase/migrations/      0001_profiles.sql, 0002_core.sql
src/
  api.js                  SATU pintu data untuk tampilan. Lihat "Konvensi".
  server.js               request(method, path, body) ke /api dengan token sesi
  auth.js, supabase.js    Sesi Supabase; authEnabled = false berarti mode demo
  i18n.js, locales/       t(), te(), tSplit(), format tanggal/angka
  router.js, menu.js      Rute, isi sidebar dan menu pengaturan
  layouts/User.vue        Shell: sidebar desktop, tab bawah mobile
  components/             Page, Section, UiModal, UiConfirm, UiPagination, UiToast, RowSkeleton
  pages/                  Login, Account, Comment, Automation, Setting, Placeholder
  pages/setting/          13 halaman pengaturan
vercel.json               Rewrite /api/(.*) → /api/index?__path=$1, sisanya ke index.html
```

## Status fitur

**A. Server + tampilan sudah ditulis** (belum diuji dengan layanan sungguhan)

| Fitur | Tampilan | Rute server |
| --- | --- | --- |
| Login, daftar, keluar, ganti password | `pages/Login.vue`, `pages/setting/Profile.vue` | Supabase Auth langsung dari browser |
| Dashboard | `pages/Dashboard.vue` | `GET /dashboard` |
| Pengaturan AI + riwayat token | `pages/setting/AI.vue` | `GET/PUT /ai`, `GET /ai/usage`, `GET /ai/usage/summary` |
| Integrasi Akun (Instagram) | `pages/Account.vue` | `GET /accounts`, `DELETE /accounts/:id`, `GET /instagram/authorize`, `GET /instagram/callback` |
| Komentar | `pages/Comment.vue` | `GET /comments`, `PUT /comments/:id`, `POST /comments/:id/reply` |
| Automasi (aturan balasan) | `pages/Automation.vue` | `GET/POST /rules`, `PUT/DELETE /rules/:id` |
| Webhook Meta | — | `GET/POST /webhook/meta` |

**B. Tampilan saja, data tiruan walaupun sudah login**

Profil (selain ganti password), Sesi, Log Aktivitas, 2FA, Transaksi, Notifikasi, API Publik, Developer, Webhook keluar,
Key TikWM, Redeem, Aplikasi Terhubung. Semuanya di `src/pages/setting/`, datanya dari fungsi mock di `src/api.js`.

**C. Belum ditulis** (rute jatuh ke `pages/Placeholder.vue`)

Laporan, Percakapan (DM), Kontak, Asisten AI, Konten Live, Konten Terjadwal, Storage, Template Automasi,
Akun Operator, Riset TikTok/Threads, Affiliate, Upgrade dan pembayaran, platform selain Instagram.

## Yang sudah dan belum diuji

Sudah diuji (Playwright + skrip Node, dijalankan manual; **sekarang sudah ada di repo**, lihat `tests/`):

- Semua halaman tampil tanpa error di desktop (1440px) dan mobile, bahasa ID dan EN, tanpa scroll horizontal.
- Alur mode demo: simpan, hapus dengan konfirmasi, filter, cari, salin, modal, Escape.
- Logika server secara lokal: `/health`, 401 tanpa token, 404, verifikasi webhook, penolakan tanda tangan salah,
  state OAuth palsu dan kedaluwarsa, enkripsi bolak-balik, `matchRule`, `checkEndpoint`.

Tes otomatis di repo (sejak langkah 1 di bawah):

```
npm test          # Vitest, 79 tes unit, ~1 detik
npm run test:e2e  # Playwright, mode demo (tanpa kredensial apa pun)
```

`npm test` mencakup `server/http.js` (pagination, `json`, `env`), `crypto.js` (AES-GCM bolak-balik,
tamper, kunci salah, state OAuth kedaluwarsa/palsu), `ai.js` (`checkEndpoint` menolak http/localhost/
IP privat), `db.js` (`requireUser` 401 dan terjemahan error), `autoreply.js` (`matchRule`), router
`api/index.js` (dispatch `__path`, 401/404, `:id`, body JSON), `webhook.js` (tanda tangan benar/salah,
duplikat `23505`, komentar sendiri, akun tak dikenal) dan validasi rute `rules`/`comments`.
`test:e2e` membuka semua rute mode demo, memastikan tidak ada error konsol dan tidak ada scroll
horizontal di 390px. Keduanya berjalan di `.github/workflows/test.yml` pada setiap push dan PR.

Belum pernah dijalankan:

- Query Supabase apa pun (skema, RLS, trigger `handle_new_user`, embed `comments → accounts`).
- OAuth Instagram, langganan webhook, balas komentar.
- Panggilan ke penyedia AI.
- Fungsi di Vercel sungguhan.

## Risiko yang perlu dicek lebih dulu

1. **Bentuk handler Vercel.** `api/index.js` mengekspor `GET/POST/PUT/DELETE` yang menerima `Request`.
   Pastikan ini didukung untuk proyek Vite, dan `request.url` berisi URL absolut. Cek pertama: `/api/health`.
2. **Rewrite `__path`.** Router membaca rute dari query `__path`, dengan cadangan `url.pathname`.
   Pastikan query asli (mis. `hub.challenge`, `code`, `state`) tetap terbawa setelah rewrite.
3. **Tanda tangan webhook.** `receiveWebhook` memakai `request.text()` untuk body mentah.
   Kalau Vercel sudah mem-parsing body lebih dulu, HMAC akan selalu gagal.
4. **Instagram API.** Endpoint dan nama scope ditulis dari ingatan (Graph `v23.0`, scope `instagram_business_*`).
   Cocokkan dengan dokumentasi Meta terbaru. `entry.id` webhook diasumsikan sama dengan `user_id` dari `/me`.
5. **Batas waktu webhook.** Balasan AI dijalankan sebelum webhook menjawab 200. Kalau penyedia lambat, Meta bisa
   mengirim ulang. Duplikat sudah ditangani lewat `unique (platform_comment_id)`, tapi pertimbangkan `waitUntil`.
6. **Daftar model di `src/pages/setting/ai/providers.js`** disalin dari bundle sumber dan belum diverifikasi.
   Base URL Sumopod dan Z.ai di `server/ai.js` juga belum diverifikasi.
7. **Hak cipta.** Tata letak dan teks antarmuka sangat dekat dengan Repliz. Sebelum rilis publik, teks di
   `src/locales/*.json` dan desainnya sebaiknya ditulis ulang.
8. **Kegagalan simpan komentar ditelan.** Di `server/routes/webhook.js`, error selain duplikat dari
   `insert` hanya di-`console.error` lalu webhook tetap menjawab 200 — Meta tidak akan mengirim ulang,
   jadi komentar bisa hilang tanpa jejak. Tes `tests/unit/webhook.test.js` mengunci perilaku ini apa
   adanya; putuskan apakah mau dibiarkan (200) atau dibuat 500 agar Meta mencoba lagi.

## Konvensi

- **Semua data tampilan lewat `src/api.js`.** Polanya:
  ```js
  export async function getRules() {
    if (authEnabled) return request('GET', '/rules')   // server
    await wait()
    return db.rules.map(...)                            // mode demo
  }
  ```
  Fungsi lama (halaman kelompok B) hanya punya cabang mock. Saat menyambungkannya ke server, tambahkan cabang
  `authEnabled` dan pertahankan cabang mock supaya mode demo tetap jalan.
- **Bentuk data ke tampilan**: camelCase dengan `_id` dan `createdAt`; daftar berhalaman berbentuk
  `{ docs, page, totalPages }`. Kolom database snake_case; pemetaan dilakukan di `server/routes/*` (`...Doc()`).
- **Server memakai service-role**, jadi RLS tidak melindungi. Setiap query wajib `.eq('user_id', user.id)`.
  Tabel selain `profiles` sengaja tanpa policy: browser tidak boleh mengaksesnya langsung.
- **Rahasia** (API key AI, token Instagram) disimpan lewat `encrypt()` dan tidak pernah dikirim ke browser.
  Yang dikirim hanya 4 karakter terakhir (`tokenHint`).
- **Rute baru**: tambah satu baris di array `routes` di `api/index.js`. Tetap satu function (batas paket gratis Vercel).
- **Teks**: jangan tulis teks langsung di template. Tambahkan kunci di `src/i18n.js` (ID dan EN) lalu pakai `t()`.
- **Data tiruan**: kalau bentuk `seed()` di `src/api.js` berubah, naikkan `VERSION` supaya `localStorage` lama dibuang.
- **Gaya tampilan**: pakai `Page` dan `Section`, kelas `rounded-bubble [--bubble-r:…]`, tombol `btn btn-sm`.
  `Page` punya prop `back`; isi `back=""` untuk halaman di luar Pengaturan.
- `src/api.js` dan `src/auth.js` saling impor. Aman selama nilai impor hanya dipakai di dalam fungsi, bukan di level modul.

## Rencana

Kerjakan berurutan. Tiap langkah selesai kalau kriteria "Selesai bila" terpenuhi di deployment Vercel, bukan hanya lokal.

### 0. Sambungkan platform dan buktikan alur inti (wajib sebelum yang lain)

Butuh pemilik repo: ikuti `SETUP.md` (Supabase, variabel Vercel, aplikasi Meta dengan akun tester).

- Perbaiki apa pun yang gagal, mulai dari daftar "Risiko" di atas.
- Selesai bila: daftar dan login berhasil; simpan pengaturan AI berhasil dan tercatat di riwayat; akun Instagram
  tester terhubung; komentar dari akun lain muncul di halaman Komentar dan terbalas oleh aturan kata kunci dan aturan AI.

### 1. Tes otomatis di repo — **selesai (lokal)**

- Vitest ditambahkan (`vitest.config.js`, `tests/setup.js`), 79 tes unit di `tests/unit/`.
- Playwright ditambahkan (`playwright.config.js`, `tests/e2e/demo.spec.js`) untuk mode demo.
- `npm test` dan `npm run test:e2e` tersedia; `.github/workflows/test.yml` menjalankan keduanya.
- Selesai bila: `npm test` lolos dan dijalankan di GitHub Actions pada setiap push. **Terpenuhi** —
  run pertama pada commit `4480d97` lolos dua job (unit 10s, e2e ±1m; run `43576589350`).

**Catatan lingkungan:** Vite 7 butuh Node 20.19+ / 22.12+; repo di VPS ini dijalankan dengan Node 26
dari toolchain Hermes. Playwright lokal memakai Chrome sistem (`PLAYWRIGHT_CHANNEL=chrome`), di CI
memakai Chromium yang diunduh.

### 2. Dashboard — **selesai di kode, angka belum diverifikasi di Supabase nyata**

- Rute `GET /dashboard` (`server/routes/dashboard.js`): komentar hari ini, 7 hari, menunggu balasan,
  sudah dibalas, dibalas otomatis + persentasenya, token AI minggu ini dan sepanjang waktu, jumlah akun.
  Semua query memakai `head:true` (tanpa menarik baris) dan selalu `.eq('user_id', …)`.
- Halaman `src/pages/Dashboard.vue`: enam kartu, skeleton saat memuat, ajakan menghubungkan akun bila
  belum ada akun. Awal aplikasi (`/`, `/user`, setelah login) sekarang ke `/user/dashboard`.
- Mode demo menghitung angka dari baris mock yang sama dengan halaman lain, jadi konsisten dengan daftar.
- Tes: `tests/unit/dashboard.test.js` (6 tes; menghitung dari baris nyata lewat fake Supabase, termasuk
  memastikan setiap query membawa `user_id`), plus dua tes e2e (aplikasi mendarat di dashboard, enam
  kartu berisi angka).
- Selesai bila: angka di Dashboard cocok dengan isi tabel `comments` dan `ai_usage`. **Itu bagian yang
  belum bisa dibuktikan di sini** — butuh kredensial Supabase (langkah 0).

### 3. Percakapan (DM Instagram)

- Tambah scope `instagram_business_manage_messages` dan field webhook `messages`.
- Tabel `chats` dan `messages`; rute daftar percakapan, isi percakapan, kirim pesan.
- Perluas `rules` supaya bisa berlaku untuk DM, dan catat pemakaian AI dengan tipe `chat`.
- Perhatikan aturan jendela 24 jam Meta untuk pesan balasan.
- Selesai bila: DM masuk tampil, bisa dibalas manual, dan terbalas otomatis oleh aturan.

### 4. Sambungkan halaman pengaturan kelompok B ke server

Urutan menurut manfaat:

1. **Notifikasi** dan **nama profil**: kolom di `profiles`.
2. **Log Aktivitas**: tabel `activities`, ditulis dari tiap rute server yang mengubah data.
3. **Sesi** dan **2FA**: pakai fitur Supabase Auth (daftar sesi, MFA TOTP) alih-alih membuat sendiri.
4. **Webhook keluar**: tabel `webhooks` dan `webhook_logs`; kirim event komentar setelah `handleComment`.
5. **API Publik** dan **Developer** (OAuth untuk pihak ketiga): paling besar, kerjakan terakhir atau tunda.

Halaman yang belum disambungkan sebaiknya disembunyikan dari `src/menu.js` saat `authEnabled`, supaya pengguna
tidak melihat data tiruan seolah-olah nyata.

### 5. Paket dan pembayaran

- Tentukan paket dan batasnya (jumlah akun, fitur). Terapkan batas di server, bukan hanya di tampilan.
- Integrasi payment gateway (Midtrans, Xendit, atau Duitku), halaman Upgrade, webhook pembayaran yang mengubah
  `profiles.plan` dan `expired_at`. Sambungkan halaman Transaksi dan Redeem.
- Selesai bila: pembayaran sandbox mengubah paket pengguna dan tercatat di Transaksi.

### 6. Fitur lanjutan (pilih sesuai kebutuhan)

Platform lain (Facebook Page paling dekat karena sama-sama Meta, lalu TikTok), Konten Terjadwal + Storage,
Kontak, Akun Operator, Laporan, Template Automasi, Asisten AI, Riset, Affiliate.

## Sebelum rilis ke publik

- Tulis ulang teks antarmuka dan sesuaikan desain (lihat risiko nomor 7).
- Isi `helpLinks` di `src/menu.js`; sekarang masih placeholder `#...`.
- Lolos App Review Meta dan ubah aplikasi ke mode Live.
- Tambahkan rate limit pada rute `/api`, halaman Kebijakan Privasi dan Syarat Layanan (diminta Meta), serta
  alur hapus data pengguna.
- Atur domain sendiri dan perbarui Site URL Supabase, redirect URI, dan URL webhook Meta.
