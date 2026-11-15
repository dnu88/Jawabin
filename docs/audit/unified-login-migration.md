# Audit migrasi Unified Login

## Ruang lingkup dan sumber bukti

Baseline kerja `6d2b7ab`; catatan ini menggabungkan bukti onboarding yang disampaikan
operator sesi induk dengan inspeksi working tree. Bukan klaim pengujian ulang hosted
oleh penulis dokumentasi. Tidak memuat email, password, token, atau app secret.

Sumber kontrak: [panduan migrasi resmi Meta](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-instagram-login/migration-guide?locale=en_US),
versi live diperiksa operator dengan pembaruan **11 November 2026**. Ekstraktor pernah
mengembalikan salinan 2024; bila bertentangan, baca halaman resmi live/HTML langsung.

## Bukti hosted yang sudah dibaca ulang

| Target | Bukti | Batas kesimpulan |
| --- | --- | --- |
| Supabase `nfxuugjcvqxjdqvrajum` | 0001–0004 diterapkan atomik via SQL Editor; katalog mengonfirmasi sembilan tabel RLS, policy own-read/update profil dengan grant update nama saja, signup trigger, constraint kanal/arah, partial unique index pesan | Tidak membuktikan 0005 atau semua perilaku fitur |
| Supabase Auth | Site URL dan redirect tepat `https://jawabin-kc75.vercel.app` tersimpan; signup UI → profil Danu/free; pengguna mengonfirmasi email lalu login | Tidak membuktikan OAuth Instagram |
| Vercel `dnu88s-projects/jawabin-kc75` | Deployment `6A5yiGqFTH1KYDcviPGGeS8wFRBM` Ready; env Supabase publik, service-role dan encryption key privat | Bukan deployment Unified Login |
| API hosted | JWT login: `/api/profile`, `/api/dashboard`, `/api/chats` 200; chats anonim 401 | Tidak membuktikan angka dashboard pada data Meta, simpan notifikasi, atau Log Aktivitas |
| Meta app `1128649916573434` | Jawabin Testing Unpublished; business Danu Budiarto `247027059222350`; tester `danubudiarto` diterima | Business/Creator hanya pernyataan pengguna, belum verifikasi independen |
| Meta permissions/config | `instagram_basic`, `instagram_manage_comments`, `instagram_manage_messages` Ready for testing; config `2478745309323339` tersimpan, Instagram Login Compatible Selected | Belum token, OAuth, atau subscription |
| Redirect Meta | `https://jawabin-kc75.vercel.app/api/instagram/callback` tersimpan dan dibaca ulang | Tidak membuktikan callback runtime |

Config CUSTOM **Jawabin Comments DM Testing**: General, System-user access token,
expiry 60 hari, hanya Instagram accounts wajib. Pages/ad accounts/catalogs/pixels
unchecked. `public_profile` default app, tidak ditambahkan ke config. Tidak ada izin
publishing/ads yang diperlukan dalam lingkup ini. Business target bukan indo.explained.

## Kontrak perubahan yang ditemukan di working tree (belum rilis)

- `INSTAGRAM_LOGIN_MODE=unified` memilih OAuth baru; default legacy `instagram_login`.
  Akun lama dirouting berdasarkan `auth_mode`, bukan dipindah diam-diam oleh env.
- **Transisi antarjenis login untuk akun yang sama belum didukung.** RPC menolak
  seluruh batch dengan `P0002` bila satu akun sudah terhubung memakai jenis lain,
  sebelum ada write; koneksi lama tetap utuh. Putuskan akun dulu bila memang ingin pindah.
- Refresh token legacy memakai compare-and-swap (`auth_mode` + ciphertext asal). Bila
  kalah balapan dengan reconnect, token baru diabaikan dan akun dimuat ulang sehingga
  host/token yang dipakai selalu milik jenis login yang aktif.
- Unified memakai `META_APP_ID`, `META_APP_SECRET`, `META_LOGIN_CONFIG_ID`, Facebook
  dialog OAuth dengan signed state; callback mengikat auth mode dari state.
- Graph `https://graph.facebook.com/v27.0`: exchange `/oauth/access_token`,
  `/me?fields=client_business_id`, discovery `/me/assigned_instagram_accounts`
  berhalaman lalu profil per ID Instagram. `/me` bukan akun Instagram.
- SUAT disimpan terenkripsi, expiry dari respons; tidak ditukar/refresh dengan grant
  Instagram legacy. Expiry memerlukan reconnect, bukan janji auto-refresh.
- Unified DM `POST /IG_ID/messages`; subscription `/IG_ID/subscribed_apps` untuk
  `comments,messages` dengan readback app ID dan field. Legacy mempertahankan host,
  credentials, scopes dan lifecycle sendiri.
- 0005 menambah `auth_mode` (default legacy), `client_business_id`, `login_config_id`
  dan validasi metadata. RPC `connect_instagram_accounts` service-role-only memeriksa
  semua ownership secara atomik sebelum write; tidak mentransfer akun antar-user.
- Callback menyimpan akun setelah ownership gate, kemudian subscription. Bila
  subscription gagal, baris milik user tetap ada untuk reconnect; jangan menyebut
  akun berhasil tersambung hanya karena baris tersimpan. Metadata/token tidak masuk DTO browser.

## Gate yang masih pending

| Gate | Status / bukti yang harus diisi operator setelah review |
| --- | --- |
| Unit regression legacy + Unified | **PASS working tree** — `npm test`: 184 passed, 17 files; belum bukti CI/rilis |
| SQL migration/ownership/concurrency | **PASS working tree** — `node --test tests/sql/instagram-unified.test.mjs`: 6 passed di PostgreSQL nyata, termasuk penolakan cross-mode yang mempertahankan baris lama dan race ownership |
| Build dan e2e demo | **PASS working tree** — `npm run build` sukses; `PLAYWRIGHT_CHANNEL=chrome npx playwright test`: 31 passed |
| Integrasi DB nyata + Graph stub | **PASS working tree** — `npm run test:integration`: 12 passed (tidak skipped), stack scratch memuat 0001–0005; suite ini menguji jalur DM legacy, bukan OAuth Unified nyata |
| Review hijau | **PASS dengan batas** — dua P1 dari review sudah diperbaiki: RPC menolak transisi antarjenis login sebelum write (`P0002`, baris lama utuh), dan refresh token legacy memakai compare-and-swap `auth_mode` + ciphertext lalu memuat ulang akun aktif bila kalah balapan. Transisi legacy↔Unified untuk akun yang sama **belum didukung**; akun harus diputus dulu. Perilaku ini belum diuji ke Meta nyata |
| Hosted 0005 | **PASS** — diterapkan via Supabase Management API dalam transaksi pada 2026-11-15; readback: kolom `auth_mode`/`client_business_id`/`login_config_id` ada, constraint `accounts_unified_metadata` ada, RLS aktif, RPC hanya `service_role` (anon/authenticated ditolak), 0 baris akun |
| Env Meta + deployment Unified | **PASS** — `META_APP_ID`, `META_LOGIN_CONFIG_ID`, `INSTAGRAM_LOGIN_MODE=unified`, `META_APP_SECRET` tersimpan di Production; deployment `dpl_97ZN7bB64mHeSJUPGFMC7fRx5ub3` READY; `/api/health` 200, `/api/chats` anonim 401 |
| Mode Unified di live | **PASS** — `/api/instagram/authorize` (JWT login nyata) mengembalikan `www.facebook.com/dialog/oauth` dengan `client_id=1128649916573434`, `config_id=2478745309323339`, `redirect_uri=…/api/instagram/callback`, `response_type=code`, `state` bertanda tangan; tanpa `scope` legacy |
| OAuth + discovery + encrypted persistence | **PASS** — OAuth Unified diselesaikan pemilik akun untuk `@danubudiarto`; baris `accounts` terbaca ulang: `auth_mode=unified_login`, `client_business_id=247027059222350`, `login_config_id=2478745309323339`, `platform_user_id=17841401873824846`, token tersimpan terenkripsi, `token_expires_at=2027-01-14` (sesuai konfigurasi 60 hari). UI menampilkan pesan tersambung, yang hanya terjadi setelah readback subscription lolos |
| Subscription + webhook config/readback | **PASS (konfigurasi)** — `META_VERIFY_TOKEN` dipasang; uji endpoint: token benar → 200 + challenge, token salah → 403. Langganan app dibuat lewat Graph `POST /{app-id}/subscriptions` (`object=instagram`, callback `…/api/webhook/meta`, fields `comments,messages`) dan readback mengonfirmasi `active: true` dengan field yang sama. Langganan per akun dilakukan saat connect |
| Hosted 0006 (rate limit) | **Belum diterapkan** — readback read-only 2026-11-15: `public.rate_limits` dan `hit_rate_limit` tidak ada; limiter sengaja meloloskan request |
| Webhook retry saat gagal simpan | **PASS unit** — gagal simpan komentar/DM → 500 setelah sisa batch diproses; gagal setelah tersimpan → log + 200 (tidak ada balasan ganda saat retry) |
| Real inbound comments/DM | **Pending** — butuh komentar/DM nyata dari akun Instagram lain; eligibility tester bukan bukti delivery |
| Real outbound / AI / Live / App Review | **Di luar izin saat ini** — membalas komentar/DM mengirim konten publik, butuh persetujuan eksplisit per aksi |

Dokumentasi Meta tentang testing Standard/role dan syarat Live/Advanced untuk webhook
komentar belum konsisten. Jangan menjanjikan end-to-end pada app Unpublished, menaikkan
akses, atau mempublikasikan app untuk melewati gate ini tanpa persetujuan baru.

## Reproduksi aman

```sh
# Root repo; Node sesuai package.json; Docker untuk tes SQL.
npm test
node --test tests/sql/instagram-unified.test.mjs
npm run build
npm run test:e2e
# Alternatif browser sistem bila browser bundel tidak terpasang:
PLAYWRIGHT_CHANNEL=chrome npm run test:e2e
```

Tes SQL membuat container PostgreSQL terisolasi, tidak memakai kunci hosted, memeriksa
migrasi pada baris legacy, batch ownership, rollback, privilege, dan race. Ini bukan
pemeriksaan lengkap Supabase hosted. `npm run test:integration` memerlukan stack
Supabase scratch + env aman sesuai SETUP; Graph diganti stub. Jangan jalankan reset
hosted. Hasil historis sebelum Unified tidak boleh disalin sebagai hasil migrasi ini.

Readback katalog setelah migrasi hosted yang disetujui (SQL Editor, tanpa token):

```sql
select column_name, column_default, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name = 'accounts'
  and column_name in ('auth_mode', 'client_business_id', 'login_config_id');
select conname, pg_get_constraintdef(oid)
from pg_constraint where conrelid = 'public.accounts'::regclass;
select rolname,
  has_function_privilege(rolname, 'public.connect_instagram_accounts(uuid,jsonb)', 'EXECUTE') as can_execute
from pg_roles where rolname in ('anon', 'authenticated', 'service_role');
```

Harapan ACL: anon/authenticated false, service_role true. Verifikasi juga data legacy
masih `instagram_login`, ID/user_id tidak berubah, dan status RLS tetap aktif. Jangan
menghapus kolom/metadata untuk rollback darurat: hentikan OAuth baru atau kembalikan
mode koneksi baru ke legacy bila kredensialnya valid. Akun Unified tetap butuh routing
Unified; rollback kode lama memerlukan evaluasi khusus, bukan sekadar toggle env.

Smoke non-mutasi hosted: lihat command `curl` di SETUP dan ulang login UI/Network.
Jangan replay webhook nyata/aktifkan aturan: handler dapat mengirim balasan otomatis.
Persetujuan target akun/post dan konten outbound harus diperoleh terpisah.
