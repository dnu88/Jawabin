# Changelog

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
