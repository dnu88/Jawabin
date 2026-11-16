# Setup Jawabin

Tanpa env Supabase, aplikasi berjalan dalam **mode demo** (data lokal browser).
Status bukti dan gate migrasi: [`docs/audit/unified-login-migration.md`](docs/audit/unified-login-migration.md).
Jangan menyamakan deployment Ready, login Jawabin, OAuth Instagram, dan webhook nyata.

## 1. Supabase

Target hosted yang sudah diperiksa: `nfxuugjcvqxjdqvrajum`.
Migrasi `0001_profiles.sql` sampai `0004_notification_activity.sql` sudah diterapkan
secara atomik melalui SQL Editor dan diverifikasi melalui katalog: sembilan tabel
RLS, policy profil milik sendiri, grant update hanya nama, trigger signup, constraint
kanal/arah pesan, dan partial unique index pesan. Eksekusi manual belum tentu tampil
pada migration history; **jangan jalankan ulang hanya karena history kosong**.

- Auth Site URL dan redirect yang tersimpan: `https://jawabin-kc75.vercel.app`.
- Signup UI nyata membuat profil Danu dengan paket `free`; email dikonfirmasi pengguna,
  lalu login dan akses API terautentikasi berhasil.
- Migrasi `0005_instagram_unified_login.sql` **sudah diterapkan** (2026-11-15, dalam transaksi);
  readback katalog: kolom Unified ada, RPC hanya `service_role`, RLS aktif.
- Migrasi `0008_account_checks.sql` **sudah diterapkan** (2026-11-16): riwayat pemeriksaan langganan
  per akun (`public.account_checks`, RLS tanpa policy). Dipakai `GET /api/accounts/health` dan cron.
- Migrasi `0007_webhook_deliveries.sql` **sudah diterapkan** (2026-11-16, satu transaksi; readback: tabel + 2 indeks,
  RLS aktif, 0 policy, hanya `service_role` yang menulis). Tabel ini mencatat setiap POST ke `/api/webhook/meta`
  (lihat bagian "Membaca jejak webhook"), karena log runtime Vercel hanya bertahan sekitar satu jam di plan Hobby.
- Migrasi `0006_rate_limits.sql` **sudah diterapkan** (2026-11-15, satu transaksi + readback; dibaca ulang
  2026-11-16: tabel `rate_limits` dan fungsi `hit_rate_limit` ada). Rate limit aktif (lihat bagian "Rate limit").
- Jangan menjalankan `supabase db reset` terhadap proyek hosted.

Untuk proyek baru, jalankan migrasi yang sudah direview berurutan; ambil URL, anon key,
dan service-role key melalui dashboard tanpa menyalinnya ke chat/log/dokumen.

## 2. Vercel dan env

Target: `dnu88s-projects/jawabin-kc75`, URL `https://jawabin-kc75.vercel.app`.
Deployment Unified `dpl_97ZN7bB64mHeSJUPGFMC7fRx5ub3` READY (lihat audit).

| Env | Penggunaan |
| --- | --- |
| `VITE_SUPABASE_URL` | URL publik Supabase |
| `VITE_SUPABASE_ANON_KEY` | Anon key publik; akses tetap dibatasi RLS |
| `SUPABASE_SERVICE_ROLE_KEY` | Rahasia server, jangan beri awalan `VITE_` |
| `ENCRYPTION_KEY` | Rahasia server, 64 karakter hex; pertahankan kunci lama |
| `INSTAGRAM_LOGIN_MODE=unified` | Pilihan eksplisit untuk koneksi OAuth baru setelah migrasi siap |
| `META_APP_ID=1128649916573434` | App Jawabin Testing |
| `META_APP_SECRET` | Rahasia app Meta; hanya server |
| `META_LOGIN_CONFIG_ID=2478745309323339` | Konfigurasi Unified Login yang sudah tersimpan |
| `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET` | Tetap simpan bila ada akun/alur legacy Instagram Login |
| `META_VERIFY_TOKEN` | Rahasia untuk verifikasi callback webhook |
| `CRON_SECRET` | Rahasia untuk `/api/cron/accounts`; Vercel mengirimkannya sebagai `authorization: Bearer` |

Env Supabase publik dan dua rahasia server Supabase/enkripsi sudah dikonfigurasi pada
onboarding. `META_APP_ID`, `META_APP_SECRET`, `META_LOGIN_CONFIG_ID`, `INSTAGRAM_LOGIN_MODE=unified`
dan `META_VERIFY_TOKEN` tersimpan di Production (lihat audit).
Jangan mengganti `ENCRYPTION_KEY`: token dan key AI lama akan tidak terbaca.
`INSTAGRAM_GRAPH_BASE` hanya untuk stub tes legacy; jangan isi di produksi.
Mode global memilih OAuth baru, bukan mengubah semua akun: routing/token mengikuti
`accounts.auth_mode` (`instagram_login` atau `unified_login`). Tanpa mode eksplisit,
legacy tetap menjadi default. Jangan mengganti kredensial legacy dengan kredensial Meta.

## Membaca jejak webhook

Setiap pengiriman Meta ke `/api/webhook/meta` meninggalkan satu baris di
`public.webhook_deliveries` (hanya `service_role`; RLS tanpa policy menahan `anon`).
Kolom yang dibaca pertama: `received_at`, `outcome` (`handled`, `ignored`,
`storage_failed`, `rejected`), `http_status`, `auth_mode`, dan `detail`.

- Tidak ada baris saat DM dikirim → Meta tidak mengirim; periksa setelan akun Instagram,
  langganan per akun (`subscribed_apps`), lalu Advanced Access/App Review.
- `detail` berisi `message:stored` → inbound jalan; lanjut uji balasan kata kunci.
- `message:unknown account` → `entry.id` di `payload` tidak cocok dengan
  `accounts.platform_user_id` akun yang tersambung.
- `outcome=rejected` → `detail` menyebut secret yang tidak cocok; `payload` ikut disimpan
  (hanya untuk delivery yang ditolak atau gagal disimpan). Baris lebih tua dari 14 hari
  dibersihkan sesekali oleh server.

## 3. Meta: Unified Login, bukan sekadar ganti App ID

Konfigurasi eksternal sudah dibaca ulang:

- **Jawabin Testing** `1128649916573434`, **Published** (dipublikasikan 2026-11-16 lewat dashboard; sebelumnya Unpublished), terkait business Danu Budiarto
  `247027059222350` (bukan indo.explained).
- Tester `danubudiarto` diterima (Pending hilang). Status Business/Creator adalah
  keterangan pengguna; verifikasi independen masih pending.
- `instagram_basic`, `instagram_manage_comments`, `instagram_manage_messages`: Ready for testing.
  `public_profile` adalah default app, bukan izin yang sengaja ditambahkan ke konfigurasi.
- CUSTOM **Jawabin Comments DM Testing**, General, System-user access token,
  expiry 60 hari, hanya Instagram accounts wajib; Pages, ads, katalog, pixel tidak dipilih.
- Config `2478745309323339`; setup menunjukkan **Instagram Login Compatible Selected**.
- Redirect tepat: `https://jawabin-kc75.vercel.app/api/instagram/callback` tersimpan.

OAuth Unified `@danubudiarto` dan langganan webhook app sudah lolos (lihat audit);
komentar/DM nyata yang masuk belum terbukti.
Kontrak implementasi Unified: Facebook dialog OAuth (`client_id`, `config_id`,
`redirect_uri`, `response_type=code`, state bertanda tangan), Graph Facebook v27.0,
pertukaran `/oauth/access_token`, `/me?fields=client_business_id` (bukan ID Instagram),
`/me/assigned_instagram_accounts` berhalaman, lalu profil masing-masing ID Instagram.
SUAT tidak memakai `ig_exchange_token`/`ig_refresh_token`; kedaluwarsa memerlukan reconnect.
DM memakai `POST /IG_ID/messages`; langganan akun memakai `/IG_ID/subscribed_apps`
untuk `comments,messages`, diikuti readback. Periksa kepemilikan semua akun sebelum
write/subscription; token terenkripsi dan metadata internal tidak dikirim ke browser.

Setelah gate tes/migrasi/deploy hijau, verifikasi OAuth dan subscription secara terpisah.
Callback webhook yang nantinya diperlukan: `https://jawabin-kc75.vercel.app/api/webhook/meta`,
verify token harus cocok dengan env server. Simpan dan baca ulang konfigurasi sebelum
mengklaim webhook aktif. Tester/Standard access tidak menjamin event komentar terkirim:
dokumentasi persyaratan Live/Advanced masih perlu diselesaikan, bukan alasan mengubah app ke Live.

## 4. Verifikasi yang dapat direproduksi

```sh
# Dari root repo, Node sesuai package.json; tidak menghubungi Meta.
npm ci
npm test
npm run build
npm run test:e2e
# Jika bundled browser tidak tersedia tetapi Chrome sistem ada:
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
# Infrastruktur lokal terisolasi + Graph stub, bukan Meta nyata:
npm run test:integration
```

Suite integrasi memerlukan Supabase lokal dan env server yang diambil secara aman:
`JAWABIN_INTEGRATION=1`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
Salin seluruh migrasi terbaru ke proyek scratch sebelum reset **lokal**; pastikan output
menampilkan setiap migrasi yang diharapkan. Tanpa prasyarat, hasil skipped bukan pass.
Instruksi tes SQL migrasi dan gate review ada di audit; hasil Unified terbaru masih pending.

```sh
curl --fail-with-body https://jawabin-kc75.vercel.app/api/health
# Tanpa Authorization harus 401; jangan cetak JWT ke terminal/log.
curl -s -o /dev/null -w '%{http_code}\n' https://jawabin-kc75.vercel.app/api/chats
```

Login melalui UI, lalu lihat Network untuk `/api/profile`, `/api/dashboard`, `/api/chats`:
ketiganya sudah 200 pada onboarding dengan JWT valid; akses chats anonim sudah 401.
Jangan membagikan header Authorization atau callback yang mengandung code/state.

## 5. Batas izin pengujian

Belum disetujui: DM/komentar/post nyata, auto-reply nyata, permintaan AI berbayar,
Live mode, atau App Review. Jangan mengaktifkan aturan sebelum persetujuan akun/post,
isi balasan, dan dampak eksternal. OAuth sukses bukan bukti inbound/outbound end-to-end.

Struktur: `src/` UI, `api/index.js` router, `server/` backend,
`supabase/migrations/` skema. `npm run dev` untuk demo; `npx vercel dev` untuk API lokal.
Fitur mock dan rencana lanjutan tetap tercatat di [`PLAN.md`](PLAN.md).

## Penghapusan data (diminta Meta)

- Halaman publik instruksi: `https://ALAMAT-KAMU/data-deletion`. Isi alamat ini di Meta →
  **App settings → Basic → Data deletion instructions URL**.
- Pengguna menghapus akunnya sendiri dari **Pengaturan → Profil → Hapus akun**. Server memanggil
  `auth.admin.deleteUser`, dan semua tabel ikut terhapus lewat `ON DELETE CASCADE`.

## Rate limit

`supabase/migrations/0006_rate_limits.sql` membuat penghitung request. Karena sudah diterapkan di hosted, server membatasi
tiap pengguna: 120 request per menit secara umum, 10 per menit untuk simpan pengaturan AI, 30 per menit untuk
kirim balasan dan DM, 5 per jam untuk hapus akun; callback OAuth dibatasi 30 per menit per alamat IP.
Webhook Meta dan `/api/health` tidak dibatasi. **Selama migrasi ini belum dijalankan, pembatasan tidak aktif**
(request tetap dilayani dan log Vercel mencatat peringatan). Angkanya ada di `server/ratelimit.js`.

## Email pendaftaran (SMTP)

SMTP bawaan Supabase hanya mengirim beberapa email per jam dan tidak untuk produksi. Sebelum membuka pendaftaran:
Supabase → **Authentication → Emails → SMTP Settings**, isi kredensial penyedia email (mis. Resend, Brevo, atau
Amazon SES) dengan alamat pengirim dari domain sendiri, lalu naikkan batas di **Authentication → Rate Limits**.

## Tombol login Google

Tombol "Lanjutkan dengan Google" hanya tampil kalau `VITE_GOOGLE_LOGIN=1` di Vercel. Isi variabel itu setelah
penyedia Google aktif di Supabase (**Authentication → Providers → Google**); tanpa itu tombolnya gagal.

## App Review Meta

Draf deskripsi izin dan urutan rekaman layar: [`docs/meta-app-review.md`](docs/meta-app-review.md).
