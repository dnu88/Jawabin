# Changelog

## Belum dirilis — pemeriksaan langganan webhook otomatis

### Perubahan kode

- `GET /api/accounts/health`: memverifikasi langganan webhook tingkat akun
  (`subscribed_apps`) dengan token tersimpan, **memasang ulang bila kosong**, lalu
  membaca ulang untuk membuktikannya. Jawaban di-cache 5 menit; `?force=1` memaksa
  panggilan Graph baru. Halaman Akun menampilkan status itu per akun dan menyediakan
  tombol "Periksa lagi" saat bermasalah.
- `GET /api/cron/accounts` (Vercel cron harian, `authorization: Bearer $CRON_SECRET`):
  jalur yang sama untuk semua akun tanpa perlu membuka aplikasi. Endpoint tertutup
  bila `CRON_SECRET` tidak diset.
- Migrasi `0008_account_checks.sql`: riwayat hasil pemeriksaan
  (`subscribed`, `fields`, `action`, `error`), hanya `service_role`.
- `server/instagram.js`: `subscriptionState()` dipakai bersama oleh alur connect dan
  pemeriksaan, sehingga pembacaan ulang langganan hanya punya satu implementasi.
- Pemeriksaan tidak pernah melempar: kegagalan Graph disimpan sebagai `action=failed`
  dengan pesan yang sudah diredaksi, dan kegagalan menulis riwayat tidak mengubah
  jawaban.

- `server/accounthealth.js` juga membaca tipe akun profesional (`account_type`, dengan fallback
  `professional_account_type`) dan menyimpannya di `account_checks` (migrasi 0009). Halaman Akun
  memberi peringatan bila tipenya bukan `BUSINESS`. Pembacaan tipe bersifat best-effort: gagal
  membaca tipe tidak boleh menghentikan pemeriksaan langganan.

### Verifikasi

- `npm test`: **222 passed** (18 file). `npx playwright test`: **32 passed**.
  `npm run build`: sukses.
- Migrasi 0008 dan 0009 diterapkan hosted dalam satu transaksi masing-masing; readback: RLS aktif,
  0 policy, `account_checks` 8 kolom, 2 indeks.
- **DM end-to-end diuji dengan event sintetis bertanda tangan sah:** percakapan dibuat, pesan masuk
  tersimpan, aturan kata kunci jalan, dan kegagalan kirim tercatat jelas di thread
  (`Instagram error 100/2534014`). Baris uji dihapus setelah verifikasi. Sisa hambatan DM murni izin.
- **Komentar end-to-end:** komentar masuk dari `@trasistydevi` → tersimpan → dibalas dari aplikasi →
  `resolved` dengan `replied_by=manual` dan `error=''`; balasan terbit ke Instagram. Inbound dan
  outbound komentar berjalan dengan Standard Access.
- **Jejak delivery pertama yang asli** tercatat di produksi: komentar dari akun pemilik sendiri
  masuk sebagai `handled`/`own comment` (id 5, 200, tanda tangan valid). Konektivitas webhook dan
  parsing entri terbukti; sisa masalah ada di akun pengirim, bukan di endpoint.
- Setelah akun diubah ke Bisnis dan dihubungkan ulang, DM uji tetap menghasilkan 0 baris di
  `webhook_deliveries`; kesimpulan: kewenangan pengiriman Meta (Advanced Access/App Review).
- Temuan produk: reconnect membuat baris `accounts` baru dan aturan lama terhapus lewat cascade;
  aturan uji sudah dibuat ulang untuk akun baru (lihat PLAN).
- Pemeriksaan produksi setelah deploy `839b3af`: `subscribed=true`, `fields=[comments,messages]`,
  `action=checked`. Field tipe akun tidak tersedia lewat Graph v27.0 di node ini (error 100), jadi
  tipe akun belum bisa dibaca server-side.
- `CRON_SECRET` dibuat di environment Production Vercel (encrypted).
- Pemeriksaan pertama: langganan tingkat akun `danubudiarto` **aktif**
  (`subscribed=true`, `comments,messages`).
- Bug yang ketahuan dari pemeriksaan itu: pembacaan ulang `subscribed_apps` mencocokkan `app.id`
  sementara Meta mengirim `app_id`, sehingga langganan yang sehat selalu dilaporkan gagal
  (alur connect memakai pembacaan yang sama). Kini menerima `id` maupun `app_id`, dan pesan
  gagal menyertakan bentuk mentah jawaban Meta agar tidak ada lagi tebakan.

## Belum dirilis — jejak delivery webhook

### Perubahan kode

- `server/webhooklog.js` + migrasi `0007_webhook_deliveries.sql`: setiap POST ke
  `/api/webhook/meta` meninggalkan satu baris (hasil, status, mode tanda tangan,
  jumlah entry, alasan per event, dan body hanya untuk delivery yang ditolak/gagal
  disimpan). Tabel hanya untuk `service_role`, RLS tanpa policy, baris lebih tua
  dari 14 hari dibersihkan sesekali oleh server.
- `server/routes/webhook.js`: handler kini mengembalikan alasan singkat
  (`stored`, `duplicate`, `unknown account`, `mode mismatch`, `own comment`,
  `ignored`) yang ikut dicatat, sehingga "Meta tidak memanggil kami" dan
  "Meta memanggil untuk akun yang tidak terhubung" tidak lagi terlihat sama.
- Pencatatan bersifat best-effort: kegagalan menulis baris audit tidak mengubah
  status yang diterima Meta.

### Verifikasi

- `npm test`: **210 passed** (17 file). `npx playwright test`: **32 passed**.
  `npm run build`: sukses.
- Migrasi 0007 diterapkan ke hosted `nfxuugjcvqxjdqvrajum` dalam satu transaksi;
  readback katalog: tabel ada, RLS aktif, 0 policy, 12 kolom, 2 indeks.
  Uji tulis+baca dengan `service_role` berhasil, kunci `anon` membaca `[]`
  (RLS menahan), dan baris uji sudah dihapus.
- Langganan app Meta dibaca ulang lewat Graph API hari ini:
  `object=instagram`, callback `https://jawabin-kc75.vercel.app/api/webhook/meta`,
  `active=true`, field `comments` dan `messages` versi v27.0.
- Google Safe Browsing untuk domain ini **masih** ditandai (Transparency Report
  `sb.ssr` status 2); jadi langkah 1 daftar "menuju live" belum selesai.

## 2026-11-16 — serah-terima

- Dokumen disamakan dengan kondisi hosted: migrasi 0006 diterapkan (readback ulang), app Meta Published.
- Inbound komentar/DM dari akun tester masih belum masuk; temuan dan langkah berikutnya ada di PLAN.md "Serah-terima terakhir".

## Belum dirilis — halaman publik dan perbaikan keamanan

### Perubahan kode

- Halaman publik `/` menjelaskan layanan, operator, dan pemakaian akses Instagram
  sebelum pengunjung diminta masuk; `/privacy` dan `/terms` berisi kebijakan nyata.
  Rute lain tetap memerlukan sesi.
- `server/ai.js`: endpoint AI kustom kini divalidasi lewat resolusi DNS (menolak
  hostname yang mengarah ke loopback/privat, link-local metadata, IPv6 privat, dan
  hasil DNS campuran), permintaan tidak mengikuti redirect, dan pesan galat
  penyedia diredaksi sebelum dikirim ke klien.

### Verifikasi

- `npm test`: **190 passed** (17 file). `npx playwright test` (Chrome sistem):
  **32 passed**. `npm run build`: sukses. `npm audit`: 0 kerentanan.
- Domain `jawabin-kc75.vercel.app` sedang berstatus **unsafe** di Google Safe
  Browsing; rincian bukti, hipotesis pemicu, dan langkah pemilik ada di
  `docs/audit/safe-browsing-remediation.md`. Status ini **belum** selesai.

## Belum dirilis — Unified Login dan onboarding hosted

### Dokumentasi

- SETUP dan PLAN membedakan onboarding hosted terverifikasi, implementasi di working
  tree, serta gate tes/review/migrasi/deploy/Meta runtime yang masih pending.
- Audit baru: `docs/audit/unified-login-migration.md` berisi target non-rahasia,
  bukti readback, kontrak Graph Facebook v27.0/SUAT, reproduksi tes, dan ACL migration.
- Supabase hosted 0001–0004, Auth signup/konfirmasi/login dan API profil/dashboard/chats
  telah diverifikasi dalam sesi onboarding; tidak dianggap bukti Meta end-to-end.
- App Meta Jawabin Testing tetap Unpublished. Config `2478745309323339`, tiga izin
  Instagram dan redirect telah disimpan/readback; belum token, OAuth atau webhook.

### Perubahan kode yang sedang direview (bukan klaim rilis)

- Mode OAuth baru eksplisit `INSTAGRAM_LOGIN_MODE=unified` dengan env Meta terpisah.
  Akun legacy mempertahankan credentials dan routing/lifecycle per `auth_mode`.
- Migrasi additive 0005: metadata login dan RPC service-role-only untuk batch akun
  dengan ownership atomik. Discovery berhalaman, subscription dengan readback,
  DM Unified memakai ID Instagram; metadata/token tidak masuk DTO publik.

### Verifikasi dan batas izin

- Operator menjalankan ulang working tree: unit **184 passed**, SQL PostgreSQL terisolasi
  **6 passed**, integrasi Supabase scratch + Graph stub **12 passed**, e2e demo **31 passed**,
  serta build sukses. Ini belum klaim CI/rilis atau Meta end-to-end.
- Review keamanan selesai dengan dua P1 diperbaiki: penolakan transisi antarjenis login
  sebelum write, dan compare-and-swap pada refresh token legacy. Akun yang sudah
  terhubung harus diputus dulu untuk berpindah jenis login.
- Penerapan hosted 0005, env Meta runtime, deployment Unified, serta OAuth/subscription
  nyata masih pending.
- `CLAUDE.md` belum dibuat: penulisan file instruksi terlindungi ditolak karena approval timeout;
  tidak dicoba lewat jalur lain. Dokumentasi operasional tetap tersedia di SETUP/PLAN/audit.
- Outbound DM/komentar/post, AI berbayar, Live mode dan App Review tidak diizinkan
  dalam lingkup sekarang. OAuth/subscription/inbound/outbound dilaporkan terpisah.
