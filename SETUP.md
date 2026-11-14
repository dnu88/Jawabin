# Setup Jawabin

Kodenya sudah lengkap untuk alur inti: **login → hubungkan Instagram → komentar masuk → dibalas aturan atau AI**.
Yang tersisa adalah pengaturan di tiga platform: Supabase, Vercel, dan Meta.

Tanpa pengaturan ini, web berjalan dalam **mode demo** (tanpa login, data tiruan di browser).

## 1. Supabase (database dan login)

1. Buat proyek di https://supabase.com/dashboard.
2. Buka **SQL Editor** dan jalankan isi tiga file ini, berurutan:
   - `supabase/migrations/0001_profiles.sql`
   - `supabase/migrations/0002_core.sql`
   - `supabase/migrations/0003_chats.sql`
3. Buka **Project Settings → API** dan catat tiga nilai: **Project URL**, **anon public key**, **service_role key**.
4. Buka **Authentication → URL Configuration**, isi **Site URL** dengan alamat Vercel (mis. `https://jawabin.vercel.app`).
5. Opsional, login Google: **Authentication → Providers → Google**, isi OAuth client dari Google Cloud.

## 2. Vercel (environment variables)

Buka **Settings → Environment Variables** dan tambahkan:

| Nama | Isi |
| --- | --- |
| `VITE_SUPABASE_URL` | Project URL dari Supabase |
| `VITE_SUPABASE_ANON_KEY` | anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role key. **Jangan** beri awalan `VITE_` |
| `ENCRYPTION_KEY` | 64 karakter hex. Buat dengan `openssl rand -hex 32` |
| `INSTAGRAM_APP_ID` | dari langkah 3 |
| `INSTAGRAM_APP_SECRET` | dari langkah 3 |
| `META_VERIFY_TOKEN` | string acak buatan sendiri |

Setelah itu **Redeploy**. Cek `https://ALAMAT-KAMU/api/health`: harus menjawab `{"ok":true}`.

`ENCRYPTION_KEY` dipakai untuk mengenkripsi API key AI dan token Instagram. Kalau nilainya diganti atau hilang,
semua key dan akun yang tersimpan harus dimasukkan ulang.

## 3. Meta (Instagram)

1. Buat aplikasi tipe **Business** di https://developers.facebook.com/apps.
2. Tambahkan produk **Instagram**, pilih **API setup with Instagram login**.
3. Catat **Instagram app ID** dan **Instagram app secret** (bukan App ID Facebook), lalu isi ke Vercel.
4. Di **Business login settings**, isi **OAuth redirect URI**: `https://ALAMAT-KAMU/api/instagram/callback`
5. Di **Webhooks**:
   - Callback URL: `https://ALAMAT-KAMU/api/webhook/meta`
   - Verify token: nilai `META_VERIFY_TOKEN`
   - Centang field **comments** dan **messages** (komentar dan pesan langsung)
6. Selama aplikasi masih mode **Development**, hanya akun Instagram yang didaftarkan sebagai tester
   (**App roles → Roles → Instagram Tester**) yang bisa dihubungkan, dan webhook hanya terkirim untuk akun itu.
7. Supaya bisa dipakai akun orang lain, ajukan **App Review** untuk izin `instagram_business_basic`,
   `instagram_business_manage_comments`, dan `instagram_business_manage_messages`, lalu ubah aplikasi ke mode **Live**.

Akun Instagram yang dihubungkan harus akun profesional (Bisnis atau Kreator).

## 4. Coba alurnya

1. Daftar akun di web, lalu login.
2. **Pengaturan → AI**: pilih penyedia, tempel API key, pilih model, Simpan. Server mengirim satu request uji.
3. **Integrasi Akun → Hubungkan Instagram**.
4. **Konten Automasi → Aturan baru**: buat aturan kata kunci atau AI. Untuk DM, pilih **Balas di: Pesan langsung**.
5. Komentari salah satu post dari akun Instagram lain. Komentar muncul di **Komentar** dan dibalas otomatis.
6. Kirim DM ke akun Instagram itu dari akun lain. Percakapan muncul di **Percakapan**, bisa dibalas manual,
   dan dibalas otomatis oleh aturan DM selama masih di dalam jendela 24 jam.

## Struktur

- `src/` — tampilan (Vue 3 + Vite). `src/api.js` memanggil server saat login aktif, data tiruan saat mode demo.
- `api/index.js` — satu Vercel Function yang melayani semua rute `/api/*`.
- `server/` — logika server: database, enkripsi, AI, Instagram, balasan otomatis.
- `supabase/migrations/` — skema database.

Jalankan lokal dengan `npm run dev` (mode demo), atau `npx vercel dev` supaya `/api` ikut jalan.

## Yang belum ada

- Halaman selain AI, Integrasi Akun, Komentar, Percakapan, dan Automasi masih memakai data tiruan
  (Sesi, 2FA, Transaksi, Webhook, API Publik, Developer, dan lainnya).
- Platform selain Instagram, pembayaran dan paket, operator, token Jawabin.
