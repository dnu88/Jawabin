# Jawabin — kondisi sekarang dan rencana lanjutan

Dokumen serah-terima untuk siapa pun (orang atau agen) yang meneruskan proyek ini.
Langkah setting platform ada di [`SETUP.md`](SETUP.md); dokumen ini tidak mengulangnya.

## Ringkasan

Jawabin adalah aplikasi web untuk mengelola dan membalas komentar media sosial secara otomatis.
Tampilan dan teksnya direkonstruksi dari bundle publik Repliz (`repliz.com`), dengan merek diganti menjadi Jawabin.

Alur inti sudah ditulis ujung ke ujung: **login → hubungkan Instagram → komentar masuk → dibalas aturan atau AI**.
Onboarding hosted Supabase + Vercel **sudah diverifikasi** (signup, konfirmasi email, login,
API profil/dashboard/chats), begitu juga OAuth Unified Login dan langganan webhook. Komentar/DM nyata
yang masuk, balasan keluar, dan penyedia AI **belum terbukti pada layanan nyata**.
Status rinci: [`docs/audit/unified-login-migration.md`](docs/audit/unified-login-migration.md).

### Gate Unified Login (pembaruan onboarding)

| Lapisan | Status |
| --- | --- |
| Hosted Supabase 0001–0005 | Diterapkan; readback katalog 2026-11-15: kolom Unified ada, RPC hanya `service_role`, RLS aktif di 9 tabel |
| Hosted Supabase 0006 (rate limit) + 0007 (jejak webhook) | **Diterapkan** (satu transaksi + readback). Readback ulang 2026-11-16: tabel `rate_limits`, fungsi `hit_rate_limit`, dan `webhook_deliveries` (RLS aktif, 0 policy) ada |
| Hosted Vercel + Auth | Deployment commit `451643c` READY dan CI hijau; `/api/health` `{"ok":true}`; chats anonim 401; webhook tanpa tanda tangan 401 |
| Meta eksternal | App **Published** (bukan Unpublished lagi); ikon, URL privasi/ketentuan/penghapusan data, dan kategori sudah diisi; `danubudiarto` dan `trasistydevi` terdaftar tester; tes webhook dari dashboard Meta masuk ke Vercel dan dijawab 200 |
| Kode Unified + migrasi 0005 | Rilis; unit, SQL, build, e2e, integrasi lolos (lihat audit) |
| OAuth + subscription | **Lolos** — `@danubudiarto` tersambung sebagai `unified_login`; langganan app `active: true` untuk `comments,messages` |
| Inbound komentar/DM nyata | **Belum masuk** — komentar dan DM dari `trasistydevi` (sebelum dan sesudah publish) tidak sampai: database 0 komentar/chat/pesan. Sejak 0007 setiap POST Meta tercatat di `webhook_deliveries`, jadi pengiriman berikutnya bisa dibedakan: tidak ada baris = Meta tidak mengirim; ada baris = kami yang menolak. Lihat "Serah-terima terakhir" di bawah |
| Outbound/AI nyata, Live/App Review | **Tidak diizinkan dalam lingkup sekarang** |

Selesai bila: regression legacy dan Unified hijau, tes migrasi/ownership disetujui,
0005 diterapkan dan dibaca ulang, deployment baru diverifikasi (semua sudah terpenuhi); OAuth,
subscription, inbound, dan outbound dilaporkan sebagai gate terpisah. Jangan mengklaim selesai hanya
dari stub Graph. Outbound dan publikasi memerlukan persetujuan baru.

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
  instagram.js            OAuth, token 60 hari + perpanjangan, balas komentar, kirim DM
  autoreply.js            matchRule() dan autoReply()
  chat.js                 Terima DM, jendela 24 jam, balasan otomatis untuk DM
  routes/                 ai, accounts, chats, comments, dashboard, rules, webhook
supabase/migrations/      0001_profiles.sql … 0005_instagram_unified_login.sql, 0006_rate_limits.sql
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

**A. Server + tampilan sudah ditulis** (hosted Auth/API dasar teruji; fitur Meta/AI belum)

| Fitur | Tampilan | Rute server |
| --- | --- | --- |
| Login, daftar, keluar, ganti password | `pages/Login.vue`, `pages/setting/Profile.vue` | Supabase Auth langsung dari browser |
| Dashboard | `pages/Dashboard.vue` | `GET /dashboard` |
| Pengaturan AI + riwayat token | `pages/setting/AI.vue` | `GET/PUT /ai`, `GET /ai/usage`, `GET /ai/usage/summary` |
| Integrasi Akun (Instagram) | `pages/Account.vue` | `GET /accounts`, `DELETE /accounts/:id`, `GET /instagram/authorize`, `GET /instagram/callback` |
| Komentar | `pages/Comment.vue` | `GET /comments`, `PUT /comments/:id`, `POST /comments/:id/reply` |
| Percakapan (DM) | `pages/Conversation.vue` | `GET /chats`, `GET /chats/:id`, `POST /chats/:id/messages` |
| Automasi (aturan balasan) | `pages/Automation.vue` | `GET/POST /rules`, `PUT/DELETE /rules/:id` |
| Notifikasi | `pages/setting/Notification.vue` | `GET /profile`, `PUT /profile/notification` |
| Hapus akun | `pages/setting/Profile.vue` | `POST /profile/delete` (wajib mengetik email akun) |
| Log Aktivitas | `pages/setting/Activity.vue` | `GET /activities`; ditulis otomatis oleh `api/index.js` |
| Webhook Meta | — | `GET/POST /webhook/meta` |

**B. Tampilan saja, data tiruan walaupun sudah login**

Profil (selain ganti password), Sesi, 2FA, Transaksi, API Publik, Developer, Webhook keluar,
Key TikWM, Redeem, Aplikasi Terhubung. Semuanya di `src/pages/setting/`, datanya dari fungsi mock di `src/api.js`.

**C. Belum ditulis** (rute jatuh ke `pages/Placeholder.vue`)

Laporan, Kontak, Asisten AI, Konten Live, Konten Terjadwal, Storage, Template Automasi,
Akun Operator, Riset TikTok/Threads, Affiliate, Upgrade dan pembayaran, platform selain Instagram.

## Yang sudah dan belum diuji

Sudah diuji (Playwright + skrip Node, dijalankan manual; **sekarang sudah ada di repo**, lihat `tests/`):

- Semua halaman tampil tanpa error di desktop (1440px) dan mobile, bahasa ID dan EN, tanpa scroll horizontal.
- Alur mode demo: simpan, hapus dengan konfirmasi, filter, cari, salin, modal, Escape.
- Logika server secara lokal: `/health`, 401 tanpa token, 404, verifikasi webhook, penolakan tanda tangan salah,
  state OAuth palsu dan kedaluwarsa, enkripsi bolak-balik, `matchRule`, `checkEndpoint`.

Tes otomatis di repo (sejak langkah 1 di bawah):

```
npm test                 # Vitest unit (205 tes per 2026-11-15)
npm run test:e2e         # Playwright demo tanpa kredensial
npm run test:integration # Supabase lokal + stub Graph (butuh Docker/env)
```

`test:integration` menjalankan alur DM pada infrastruktur sungguhan: Postgres + Auth + PostgREST
dari `supabase start`, migrasi lokal yang disalin dari repo, JWT GoTrue nyata, tanda tangan webhook HMAC nyata, dan
HTTP nyata ke `api/index.js`. Hanya Instagram Graph yang diganti stub lokal yang merekam request,
karena tanpa app Meta tidak ada yang bisa dipanggil. Fixture webhook-nya memakai bentuk yang
didokumentasikan Meta (`entry[].messaging[]`), bukan bentuk karangan. Hasil historis sebelum Unified: **12/12 lolos**;
ini bukan hasil regression Unified/0005. Hasil terbaru menunggu review.
Tes ini tidak masuk CI (butuh Docker dan ±2 GB image), jalankan manual:

```
supabase start            # di salinan proyek Supabase lokal
supabase status -o env    # ambil API_URL, ANON_KEY, SERVICE_ROLE_KEY
JAWABIN_INTEGRATION=1 SUPABASE_URL=… SUPABASE_ANON_KEY=… SUPABASE_SERVICE_ROLE_KEY=… \
  npm run test:integration
```

`npm test` mencakup `server/http.js` (pagination, `json`, `env`), `crypto.js` (AES-GCM bolak-balik,
tamper, kunci salah, state OAuth kedaluwarsa/palsu), `ai.js` (`checkEndpoint` menolak http/localhost/
IP privat), `db.js` (`requireUser` 401 dan terjemahan error), `autoreply.js` (`matchRule`), router
`api/index.js` (dispatch `__path`, 401/404, `:id`, body JSON), `webhook.js` (tanda tangan benar/salah,
duplikat `23505`, komentar sendiri, akun tak dikenal) dan validasi rute `rules`/`comments`.
`test:e2e` membuka semua rute mode demo, memastikan tidak ada error konsol dan tidak ada scroll
horizontal di 390px. Keduanya berjalan di `.github/workflows/test.yml` pada setiap push dan PR.

Sudah diverifikasi pada hosted onboarding: migrasi 0001–0004, sembilan tabel RLS,
policy profil/grant nama, trigger signup, constraint kanal/arah dan indeks pesan;
signup/konfirmasi/login, `/api/profile`, `/api/dashboard`, `/api/chats` 200 dengan JWT,
chats anonim 401. Ini tidak membuktikan isi dashboard pada data Instagram nyata,
penyimpanan notifikasi, atau event Log Aktivitas.

Belum dijalankan atau belum dinyatakan selesai:

- Komentar/DM nyata yang masuk, balas komentar, dan pengiriman DM ke **API Meta sungguhan**
  (OAuth dan langganan webhook sudah lolos). Kontraknya sudah dicocokkan dengan dokumentasi resmi; lihat risiko 4 dan 9.
- Panggilan ke penyedia AI.

## Risiko yang perlu dicek lebih dulu

1. **Bentuk handler Vercel.** `api/index.js` mengekspor `GET/POST/PUT/DELETE` yang menerima `Request`.
   Pastikan ini didukung untuk proyek Vite, dan `request.url` berisi URL absolut. Cek pertama: `/api/health`.
2. **Rewrite `__path`.** Router membaca rute dari query `__path`, dengan cadangan `url.pathname`.
   Pastikan query asli (mis. `hub.challenge`, `code`, `state`) tetap terbawa setelah rewrite.
3. **Tanda tangan webhook.** `receiveWebhook` memakai `request.text()` untuk body mentah.
   Kalau Vercel sudah mem-parsing body lebih dulu, HMAC akan selalu gagal.
4. **Dua kontrak login, jangan dicampur.** Catatan host/scope berikut khusus **legacy**;
   Unified memakai Graph Facebook v27.0, ID Instagram dari assigned accounts, SUAT,
   `/IG_ID/messages`, dan config permissions (lihat SETUP/audit). Mode akun menentukan
   routing dan lifecycle token; env global hanya memilih koneksi baru. Kontrak legacy:
   host `graph.instagram.com`, `POST /me/messages`, body `{recipient:{id}, message:{text}}`, balasan
   `{recipient_id, message_id}`, batas teks 1000 **byte** UTF-8, scope `instagram_business_basic` +
   `instagram_business_manage_messages` + `instagram_business_manage_comments`. Yang belum terbukti:
   `entry.id` webhook dianggap sama dengan `user_id` dari `/me` — benar untuk pelanggan Business Login,
   tapi tolong pastikan saat akun tester pertama tersambung (bandingkan dengan `GET /me?fields=id`).
5. **Batas waktu webhook.** Balasan AI dijalankan sebelum webhook menjawab 200. Kalau penyedia lambat, Meta bisa
   mengirim ulang. Duplikat sudah ditangani lewat `unique (platform_comment_id)`, tapi pertimbangkan `waitUntil`.
6. **Daftar model di `src/pages/setting/ai/providers.js`** disalin dari bundle sumber dan belum diverifikasi.
   Base URL Sumopod dan Z.ai di `server/ai.js` juga belum diverifikasi.
7. **Hak cipta.** Tata letak dan teks antarmuka sangat dekat dengan Repliz. Sebelum rilis publik, teks di
   `src/locales/*.json` dan desainnya sebaiknya ditulis ulang.
8. **Kegagalan simpan webhook — diperbaiki.** Bila komentar atau DM gagal disimpan, sisa batch tetap
   diproses lalu webhook menjawab 500 supaya Meta mengirim ulang; pengiriman ulang aman karena
   dedupe `platform_comment_id`/`platform_message_id`. Kegagalan *setelah* tersimpan (balasan otomatis,
   badge unread) hanya dicatat dan tetap 200, sehingga retry tidak pernah mengirim balasan kedua.
   Kegagalan yang menetap (mis. tabel hilang) membuat Meta terus mencoba dan bisa menonaktifkan
   langganan; pantau log Vercel `comment failed`/`message failed`.
9. **DM — kontrak sudah diverifikasi ke dokumentasi, bukan lagi ingatan.** Dokumentasi Meta
   (Instagram Platform → Webhooks, update Sep–Okt 2026) memakai `entry[].messaging[]` untuk pesan,
   **bukan** `changes[]` bertanda `field: "messages"`. Versi pertama kode ini salah bentuk dan tidak
   akan pernah menerima DM; sudah diperbaiki, dan webhook sekarang menerima keduanya. Ikut diperbaiki
   dari dokumentasi yang sama: `is_echo` (pesan kita sendiri dipantulkan balik), `is_self` (pesan uji),
   `is_deleted` (tombstone → baris dihapus), pesan tanpa teks (lampiran saja), batas 1000 byte, dan
   kode error Meta (`code`/`error_subcode`, mis. `10/2534022` untuk di luar jendela).
   Sisa yang belum bisa dibuktikan tanpa app sungguhan: (a) jendela 24 jam — Meta mengizinkan sampai
   7 hari untuk iklan klik-ke-DM, kode ini sengaja konservatif 24 jam; (b) `messaging_postbacks`,
   `messaging_referrals`, dan `messaging_seen` belum ditangani; (c) `admin_text`/handoff notice
   diabaikan (tidak punya `mid`).

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
- **Aturan punya kanal.** `rules.channel` = `comment` | `chat` | `both`; `matchRule(rules, target, channel)`
  menyaringnya, dan aturan lama tanpa kolom itu dianggap `comment`. Balasan DM yang memakai AI dicatat
  ke `ai_usage` dengan tipe `chat`, bukan `content`.
- **Basis URL Instagram bisa ditimpa.** `INSTAGRAM_GRAPH_BASE` (default `https://graph.instagram.com/v23.0`)
  hanya dipakai tes integrasi legacy untuk menunjuk stub lokal; jangan diisi di produksi.
  Unified memakai `https://graph.facebook.com/v27.0`, bukan override legacy.
- **Bentuk payload webhook mengikuti dokumentasi Meta, bukan tebakan.** Komentar datang sebagai
  `entry[].changes[]` berisi `field: "comments"`; contoh Business Login juga menaruh `field`/`value`
  langsung di `entry`, jadi keduanya diterima. Pesan datang sebagai `entry[].messaging[]`; pembungkus
  lama (`changes[]` + `field: "messages"`) tetap diterima supaya tidak pecah kalau Meta berubah lagi.
  `message.is_echo` dan `is_self` diabaikan, `is_deleted` menghapus baris yang sudah tersimpan, pesan
  lampiran tanpa teks disimpan tapi tidak diumpankan ke mesin aturan, dan batas teks dihitung
  `textBytes()` — 1000 **byte** UTF-8, bukan 1000 karakter.
- **Rute baru**: tambah satu baris di array `routes` di `api/index.js`. Tetap satu function (batas paket gratis Vercel).
  Untuk rute yang mengubah data, isi elemen keempat `[modul, aksi]` supaya tercatat di Log Aktivitas;
  pakai pasangan yang punya kunci `activity.event.<modul>_<aksi>` di `src/locales/*.json`.
- **Teks**: jangan tulis teks langsung di template. Tambahkan kunci di `src/i18n.js` (ID dan EN) lalu pakai `t()`.
- **Data tiruan**: kalau bentuk `seed()` di `src/api.js` berubah, naikkan `VERSION` supaya `localStorage` lama dibuang.
- **Gaya tampilan**: pakai `Page` dan `Section`, kelas `rounded-bubble [--bubble-r:…]`, tombol `btn btn-sm`.
  `Page` punya prop `back`; isi `back=""` untuk halaman di luar Pengaturan.
- `src/api.js` dan `src/auth.js` saling impor. Aman selama nilai impor hanya dipakai di dalam fungsi, bukan di level modul.

## Rencana

Kerjakan berurutan. Tiap langkah selesai kalau kriteria "Selesai bila" terpenuhi di deployment Vercel, bukan hanya lokal.

### 0. Sambungkan platform dan buktikan alur inti (wajib sebelum yang lain)

Ikuti `SETUP.md`: onboarding hosted dasar sudah lolos; lanjutkan gate Unified di atas.

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

### 3. Percakapan (DM Instagram) — **selesai di kode, teruji sampai database nyata**

- Scope `instagram_business_manage_messages` ditambahkan, dan langganan webhook kini
  `comments,messages` (`server/instagram.js`).
- Migrasi `supabase/migrations/0003_chats.sql`: tabel `chats` + `messages` (RLS tanpa policy, sama
  seperti tabel lain) dan kolom `rules.channel` (`comment`/`chat`/`both`, default `comment`).
- `server/chat.js`: `receiveMessage()` menyimpan DM (idempoten lewat unique `platform_message_id`),
  menaikkan `unread`, lalu menjalankan aturan kanal `chat`; balasan AI dicatat sebagai `ai_usage`
  bertipe `chat`. `windowOpen()` menjaga jendela balas 24 jam Meta.
- Rute: `GET /chats`, `GET /chats/:id` (menghapus badge unread), `POST /chats/:id/messages`
  (menolak 400 di luar jendela, bukan membiarkan provider yang menolak).
- Tampilan `src/pages/Conversation.vue`: daftar percakapan + thread, badge "jendela tutup", kirim
  manual, penanda balasan otomatis, dan pesan gagal tampil di thread. `Automation.vue` dapat pilihan
  "Balas di" (komentar / DM / keduanya) beserta badge di daftar aturan.
- Tes: `tests/unit/chat.test.js` (23 tes: jendela 24 jam, idempotensi, `is_echo`/`is_self`,
  `is_deleted`, lampiran tanpa teks, batas 1000 byte, aturan komentar tidak menjawab DM, AI +
  `ai_usage` tipe chat, kegagalan pengiriman, rute list/get/send), `tests/unit/webhook.test.js`
  (+7 tes pengiriman DM termasuk bentuk `messaging[]` dan `changes[]` lama),
  `tests/unit/instagram.test.js` (6 tes: URL/header/body `/me/messages`, override
  `INSTAGRAM_GRAPH_BASE`, kode error Meta, `/replies`), `tests/unit/autoreply.test.js` (+4 tes kanal),
  dan 2 tes e2e (kirim pesan, jendela tutup).
- Selesai bila: DM masuk tampil, bisa dibalas manual, dan terbalas otomatis oleh aturan. **Terbukti
  sampai database nyata** lewat `npm run test:integration` (12/12 lolos): webhook bertanda tangan
  asli berbentuk `messaging[]` menyimpan chat + dua pesan di Postgres, aturan DM mengirim ke Graph
  dengan header `Bearer` dan body `{recipient, message}`, dedupe `mid` bekerja, echo `is_echo`
  diabaikan, `is_deleted` menghapus baris, `GET /api/chats` jalan dengan JWT GoTrue asli, 401 tanpa
  token, unread jadi 0 saat thread dibuka, kirim manual sukses, kirim di luar jendela 24 jam ditolak
  400 tanpa memanggil Graph, user lain dapat 404, dan constraint `rules.channel` serta index unik
  `platform_message_id` menolak data salah.
- **Yang belum**: memanggil API Meta sungguhan (butuh app + akun tester). Kontraknya sudah dicocokkan
  dengan dokumentasi resmi — lihat risiko 4 dan 9 untuk sisa asumsi dan fitur yang belum ditangani.

### 4. Sambungkan halaman pengaturan kelompok B ke server

Urutan menurut manfaat:

1. **Notifikasi** — **selesai di kode, penyimpanan belum diuji hosted.** Skema 0004 sudah diterapkan. Kolom `profiles.notification`
   (migrasi 0004), rute `GET /profile` dan `PUT /profile/notification`. **Nama profil belum**: halaman Profil
   belum punya form ubah nama.
2. **Log Aktivitas** — **selesai di kode, perilaku belum diuji hosted.** Tabel `activities` (migrasi 0004 sudah diterapkan).
   `api/index.js` mencatat setiap rute yang punya elemen keempat `[modul, aksi]`, berhasil maupun gagal;
   `logActivity` tidak pernah melempar error. Tes: `tests/unit/activity.test.js` dan blok "activity log" di
   `tests/unit/router.test.js`. Yang belum: `target` dan `detail` hanya terisi untuk "hubungkan akun";
   login/logout tidak tercatat karena terjadi langsung antara browser dan Supabase; filter per operator
   diabaikan karena operator belum ada di server.
3. **Sesi** dan **2FA**: pakai fitur Supabase Auth (daftar sesi, MFA TOTP) alih-alih membuat sendiri.
4. **Webhook keluar**: tabel `webhooks` dan `webhook_logs`; kirim event komentar setelah `handleComment`.
5. **API Publik** dan **Developer** (OAuth untuk pihak ketiga): paling besar, kerjakan terakhir atau tunda.

Halaman yang belum disambungkan **sudah disembunyikan** dari menu pengaturan saat `authEnabled`:
`src/menu.js` → `visibleSettingItems(true)` menyisakan Profil, Log Aktivitas, Notifikasi, dan AI, sementara mode demo tetap
menampilkan ketiga belas halaman. Tesnya di `tests/unit/menu.test.js`; rute lama masih bisa dibuka
langsung, jadi saat menyambungkan satu halaman, pindahkan key-nya keluar dari `mockSettingKeys`.

### 5. Paket dan pembayaran

- Tentukan paket dan batasnya (jumlah akun, fitur). Terapkan batas di server, bukan hanya di tampilan.
- Integrasi payment gateway (Midtrans, Xendit, atau Duitku), halaman Upgrade, webhook pembayaran yang mengubah
  `profiles.plan` dan `expired_at`. Sambungkan halaman Transaksi dan Redeem.
- Selesai bila: pembayaran sandbox mengubah paket pengguna dan tercatat di Transaksi.

### 6. Fitur lanjutan (pilih sesuai kebutuhan)

Platform lain (Facebook Page paling dekat karena sama-sama Meta, lalu TikTok), Konten Terjadwal + Storage,
Kontak, Akun Operator, Laporan, Template Automasi, Asisten AI, Riset, Affiliate.

## Serah-terima terakhir (2026-11-16)

Titik berhenti agen sebelumnya, supaya agen atau orang berikutnya tidak mengulang pekerjaan.

**Selesai dan terbukti**
- Kode dan dokumen di branch `claude/elegant-hamilton-vormhk` (commit `451643c` + commit serah-terima ini), Vercel READY, CI hijau.
- Hosted Supabase 0001–0006 terpasang (0006 dibaca ulang 2026-11-16).
- App Meta "Jawabin Testing" (`1128649916573434`) sudah **Published**; ikon, URL privasi/ketentuan/penghapusan data, kategori terisi.
- Tes webhook dari dashboard Meta masuk ke Vercel dan dijawab 200. Langganan app `instagram` → `comments,messages` aktif; langganan akun On.
- Izin tetap dari pemilik: push+deploy ke branch kerja setelah tes lokal lolos, ubah setting Meta app, migrasi Supabase dalam transaksi + readback. Balasan nyata hanya aturan kata kunci ke akun uji milik pemilik; AI nyata belum diizinkan; hapus data dan App Review/Live perlu izin baru.

**Belum selesai: inbound nyata tidak masuk**
- DM dan komentar dari `trasistydevi` ke `@danubudiarto` tidak tercatat (DB 0 komentar/chat/pesan; tidak ada request Meta di log Vercel). Aturan "DM uji halo" masih aktif — kirim DM dengan kata "halo" dari akun uji untuk menguji balasan kata kunci.
- Dugaan penyebab (belum terbukti, urut dari murah): (1) setelan Instagram `danubudiarto` "Izinkan akses ke pesan" (Pengaturan → Pesan dan balasan story → Alat yang terhubung) belum aktif — hanya pemilik yang bisa cek di HP; (2) komentar butuh Advanced Access (App Review) untuk webhook; DM dari tester mungkin cukup Standard; (3) langganan per akun (`GET /{ig-user-id}/subscribed_apps`) belum dibaca ulang karena kunci enkripsi token (`ENCRYPTION_KEY`) tidak bisa diambil dari Vercel lewat CLI; (4) akun `trasistydevi` mungkin belum menerima peran tester (cek status "Pending" di App roles).
- Cara membaca hasil: query hanya-baca ke `comments`, `chats`, `messages`; log Vercel `/api/webhook/meta`.

**Kendala akses**
- Browser server: GitHub sudah login; Facebook dan Instagram **tidak** (diblokir/CAPTCHA dari alamat data center; kode cadangan 2FA Instagram tidak bisa dimasukkan lewat kartu aman, dan Instagram mulai membalas 429). Jangan mengulang login Instagram dari server.
- Token GitHub "openbot" (fine-grained, repo Jawabin) tidak berkedaluwarsa; ganti dengan yang berkedaluwarsa.
- Jangan tekan Reset pada App secret Meta.

**Langkah berikutnya**
1. Pemilik: pastikan "Izinkan akses ke pesan" aktif di `danubudiarto`, dan peran tester `trasistydevi` sudah diterima.
2. Kirim 1 DM "halo" dari `trasistydevi`, catat jamnya, lalu cek DB + log Vercel.
3. Bila tetap kosong: baca `subscribed_apps` akun (butuh akses `ENCRYPTION_KEY` atau sambungkan ulang akun dari UI), lalu telusuri syarat Advanced Access / App Review (`docs/meta-app-review.md`).
4. Setelah inbound terbukti: uji balasan kata kunci ke akun uji; AI nyata dan Live penuh tetap perlu izin pemilik.

### Lanjutan 2026-11-16 (sesi Forge) — bukti inbound bisa dibaca

**Yang ditambahkan**
- Migrasi `0007_webhook_deliveries.sql` (diterapkan hosted, readback: RLS aktif, 0 policy)
  dan `server/webhooklog.js`: satu baris per POST ke `/api/webhook/meta`.
- Handler webhook mengembalikan alasan per event (`stored`, `duplicate`, `unknown account`,
  `mode mismatch`, `own comment`, `ignored`) dan alasan itu disimpan. Body hanya disimpan
  untuk delivery yang ditolak atau gagal disimpan.
- Alasan: log runtime Vercel hanya bertahan sekitar satu jam di plan Hobby, dan log request
  CDN butuh Observability Plus. Tanpa tabel ini, "Meta tidak pernah menelepon" dan
  "Meta menelepon lalu kami tolak" sama-sama tidak terlihat.

**Yang dibaca ulang dan terbukti**
- Langganan app Meta (Graph API, app access token): `object=instagram`, callback
  `https://jawabin-kc75.vercel.app/api/webhook/meta`, `active=true`, field `comments` dan
  `messages` v27.0. Jadi langganan tingkat app bukan penyebabnya.
- Database: `comments`, `chats`, `messages`, `activities` masih 0 baris; satu akun
  `danubudiarto` (`unified_login`, `platform_user_id` 17841401873824846) dan satu aturan
  kata kunci aktif.
- Google Safe Browsing: domain masih ditandai (`sb.ssr` status 2). Langkah 1 tetap belum selesai.
- CI hijau dan 210 unit + 32 e2e lolos di mesin ini sebelum push.
- Deploy `0b8b2fd` READY. Tiga probe ke produksi membuktikan jejak bekerja: tanda tangan salah →
  baris `rejected` (401) dengan `payload`, field tak ditangani → `ignored`, `entry.id` tak dikenal →
  `handled` dengan `detail=comment:unknown account`. Baris probe sudah dihapus, jadi tabel kosong
  sampai delivery Meta yang sebenarnya datang.

**Pemeriksaan otomatis (ditambahkan)**
- `GET /api/accounts/health` (dipakai halaman Akun) dan `GET /api/cron/accounts` (cron Vercel
  harian, `Bearer $CRON_SECRET`) membaca `subscribed_apps` dengan token tersimpan, memasang ulang
  bila kosong, lalu membaca ulang. Hasilnya tersimpan di `public.account_checks`.
- Artinya: kalau langganan tingkat akun ternyata kosong, sistem memperbaikinya sendiri dan
  halaman Akun menampilkan status sebenarnya — bukan tebakan. Kalau pemeriksaan gagal, pesan
  galat Graph (sudah diredaksi) yang muncul.
- **Hasil pemeriksaan pertama (2026-11-16):** langganan tingkat akun **aktif** —
  `subscribed=true`, `fields=[comments,messages]`, `action=checked`. Jadi langganan app dan
  langganan akun dua-duanya benar; penyebab inbound tidak masuk bukan di situ.
- **Bug verifikasi yang ditemukan sambil jalan:** pembacaan ulang `subscribed_apps` mencocokkan
  `app.id`, padahal Meta menjawab `app_id`, sehingga pemeriksaan lama selalu melaporkan "gagal"
  walau langganan terpasang. Kini dicocokkan ke `id` **atau** `app_id`. Alur connect memakai
  fungsi yang sama, jadi bug ini juga bisa memunculkan galat palsu saat menghubungkan akun.
- **DM nyata dari `trasistydevi` (2026-11-16) juga tidak menghasilkan satu pun baris** di
  `webhook_deliveries`, padahal langganan app dan akun terbukti aktif. Jadi Meta memang tidak
  mengirim event untuk akun ini.
- Dugaan utama sekarang: **tipe akun Instagram**. Pesan (DM) hanya tersedia untuk akun **Bisnis**;
  akun **Kreator** bisa punya langganan sempurna dan tetap tidak menerima apa pun. Pemeriksaan
  otomatis mencoba membaca `account_type` lewat Graph tetapi field itu tidak ada di v27.0 untuk
  node ini (`(#100) Tried accessing nonexisting field`), jadi tipe akun harus dikonfirmasi pemilik
  di aplikasi Instagram (Pengaturan → Jenis akun).
- **Setelah akun diganti ke Bisnis dan dihubungkan ulang** (akun baru `a61d4b58…`, token sampai
  2027-01-15, langganan terverifikasi `comments,messages`), DM dari `trasistydevi` **tetap 0 delivery**.
  Diagnosa di sisi server selesai: kode, langganan app, langganan akun, callback, dan tipe akun
  semuanya benar. Yang tersisa hanya kewenangan pengiriman Meta — Standard Access → Advanced Access
  lewat App Review. Itu keputusan Meta, bukan pekerjaan repo.
- Catatan perilaku produk (dibuktikan dari `activities`): id akun berubah karena pemilik menekan
  **Putuskan** lebih dulu — delete itu menghapus baris akun dan **aturan yang terikat ikut hilang**
  lewat cascade. RPC connect sendiri sudah `on conflict do update`, jadi reconnect tanpa disconnect
  mempertahankan id dan aturan. Aturan uji "DM uji halo" sudah dibuat ulang untuk akun baru, dan
  teks konfirmasi Putuskan kini menyebut aturan otomatis ikut terhapus.
- **Gerbang sebelum submit:** `python3 scripts/review-readiness.py https://<domain>` memeriksa semua
  yang bisa dilihat Meta dari luar tanpa sesi (halaman publik, health, gerbang auth, penolakan
  handshake webhook, status Safe Browsing). Status 2026-11-16: **7/8 lolos**; satu-satunya yang
  gagal adalah Safe Browsing (domain masih ditandai), yang justru menghalangi peninjau membuka app.
- Jawaban formulir versi Inggris (siap salin) ada di `docs/meta-app-review.md` bagian
  "English answers for the review form".
  Bukti berikutnya: tombol **Test** pada webhook Instagram di dashboard Meta akan meninggalkan
  baris di `webhook_deliveries` bila Meta memang bisa mencapai endpoint ini.

**Langkah berikutnya (urut)**
1. Pemilik: kirim satu DM berisi kata `halo` dari `trasistydevi` ke `@danubudiarto`, catat jamnya.
2. Baca `select received_at, outcome, http_status, auth_mode, detail from public.webhook_deliveries
   order by received_at desc limit 10;` dengan service role. Halaman Settings → Webhook di aplikasi
   belum tersambung ke tabel ini, jadi belum bisa dipakai sebagai bukti.
   - **0 baris**: Meta tidak mengirim → setelan "Izinkan akses ke pesan" di akun Instagram,
     langganan per akun (`subscribed_apps`), atau Advanced Access/App Review.
   - **`detail` berisi `message:stored`**: inbound sudah jalan; lanjut uji balasan kata kunci.
   - **`message:unknown account`**: `platform_user_id` tidak cocok — cek `entry.id` di `payload`.
   - **`outcome=rejected`**: `detail` + `payload` menunjukkan secret yang tidak cocok.
3. Untuk membaca `subscribed_apps` per akun tetap perlu `ENCRYPTION_KEY` (tidak bisa diambil
   dari CLI karena ditandai Sensitive di Vercel); sambungkan ulang akun dari UI bila perlu.

## Menuju live — daftar periksa

"Live" di sini berarti orang lain bisa mendaftar, menghubungkan akun Instagram mereka sendiri, dan komentar
serta DM mereka terbalas. Tiga hal menghalanginya; urutannya penting.

### 1. Status Safe Browsing Google (pemilik) — **menghalangi semuanya**

Chrome menandai `jawabin-kc75.vercel.app` sebagai situs berbahaya, sehingga login dan OAuth terblokir.
Rincian dan langkah pemilik: [`docs/audit/safe-browsing-remediation.md`](docs/audit/safe-browsing-remediation.md).

- Search Console → Security issues → **Request review** setelah deployment terbaru aktif.
- Sangat disarankan: pindah ke **domain sendiri**. Subdomain `*.vercel.app` dengan formulir login sering
  ditandai, dan reputasinya tidak bisa dikendalikan. Setelah pindah, perbarui Site URL dan redirect di
  Supabase, redirect URI dan URL webhook di Meta, dan teks domain di `src/pages/Legal.vue`.
- Hipotesis yang belum diuji: tampilan dan teks yang sangat dekat dengan Repliz bisa ikut memicu
  klasifikasi "peniru". Menulis ulang teks dan desain (risiko 7) mengurangi kemungkinan itu.

### 2. Buktikan alur nyata dengan akun tester (pemilik + persetujuan per aksi)

- Inbound: komentar dan DM nyata dari akun Instagram lain masuk ke halaman Komentar dan Percakapan.
- Outbound: satu balasan manual, satu balasan aturan kata kunci, satu balasan AI. Tiap pengiriman adalah
  konten publik atas nama akun pemilik; minta persetujuan eksplisit sebelum mengaktifkan aturan.
- Pengaturan AI: simpan satu key nyata dan pastikan request uji tercatat.
- Hapus akun: coba **Pengaturan → Profil → Hapus akun** dengan akun percobaan, lalu pastikan barisnya
  hilang dari semua tabel. Rute `POST /api/profile/delete` baru teruji dengan Supabase tiruan.

### 3. App Review Meta, lalu mode Live (pemilik)

Tanpa ini hanya akun tester yang bisa terhubung. Yang diminta Meta dan statusnya:

| Syarat | Status |
| --- | --- |
| URL Kebijakan Privasi | Ada: `/privacy` |
| URL Ketentuan Layanan | Ada: `/terms` |
| URL instruksi penghapusan data | Ada: `/data-deletion` — isi di App settings → Basic → Data deletion instructions URL |
| Hapus data mandiri | Ada di kode: Pengaturan → Profil → Hapus akun |
| Ikon aplikasi 1024×1024, kategori, email kontak | Pemilik |
| Verifikasi bisnis | Pemilik |
| Deskripsi pemakaian tiap izin | Draf: `docs/meta-app-review.md` |
| Rekaman layar tiap izin (`instagram_basic`, `instagram_manage_comments`, `instagram_manage_messages`) | Pemilik, setelah langkah 2 berhasil |
| Domain bersih dari peringatan browser | Lihat langkah 1; peninjau Meta tidak akan melewati interstitial |

### 4. Sebelum membuka pendaftaran ke umum

- **Rate limit**: ada di kode (`server/ratelimit.js`, migrasi 0006, teruji di PostgreSQL lokal termasuk request
  serentak). **Aktif di hosted**: migrasi 0006 sudah diterapkan dan dibaca ulang.
- **Tulis ulang teks dan desain** yang berasal dari Repliz (risiko 7). Halaman login sudah ditulis dan ditata
  ulang, dan halaman publik memang buatan sendiri. Yang masih berasal dari Repliz: isi `src/locales/*.json`
  (teks halaman pengaturan) dan tata letak shell aplikasi di balik login.
- **`helpLinks`** di `src/menu.js` masih placeholder `#...`; saat ini hanya terlihat di mode demo.
- **Paket dan pembayaran** (rencana langkah 5) kalau layanan ini berbayar; tanpa itu semua pengguna gratis
  dan tanpa batas.
- **Email**: SMTP bawaan Supabase dibatasi beberapa email per jam; pasang SMTP sendiri sebelum banyak
  pendaftar.

## Sebelum rilis ke publik

- Tulis ulang teks antarmuka dan sesuaikan desain (lihat risiko nomor 7).
- Isi `helpLinks` di `src/menu.js`; sekarang masih placeholder `#...`.
- Lolos App Review Meta dan ubah aplikasi ke mode Live.
- Tambahkan rate limit pada rute `/api`, halaman Kebijakan Privasi dan Syarat Layanan (diminta Meta), serta
  alur hapus data pengguna.
- Atur domain sendiri dan perbarui Site URL Supabase, redirect URI, dan URL webhook Meta.
