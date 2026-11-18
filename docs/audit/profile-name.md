# Nama tampilan profil — verifikasi lokal

PLAN langkah 4 menempatkan nama profil sebelum sesi dan MFA. `profiles.name` adalah sumber nama yang sudah dibaca saat login. Form memakai sesi Supabase pengguna, bukan service role. Migrasi 0001 sudah memberi `UPDATE (name)` dengan RLS untuk baris sendiri; tidak ada perubahan skema. Batas 1–80 setelah trim diterapkan aplikasi, bukan constraint database.

| Pemeriksaan | Hasil |
| --- | --- |
| `npm test` | 229 lulus. Lima kasus baru dengan klien Supabase tiruan: filter ID sesi dan kolom yang ditulis, readback nama, input kosong/terlalu panjang, kegagalan update, dan sesi kosong. |
| `PLAYWRIGHT_CHANNEL=chrome npm run test:e2e -- --workers=2` | 33/33 lulus, termasuk form demo yang menolak spasi saja, memangkas spasi tepi, dan menampilkan nama tersimpan setelah reload. Hanya stylesheet Google Fonts dan respons ikon Mingcute dari CDN Iconify yang diganti fixture; aset lokal dan pemeriksaan error konsol tetap asli. |
| `npm run build` | Build produksi lokal berhasil. |

Belum diuji dengan Postgres/GoTrue nyata atau di hosted. Untuk penerimaan hosted setelah ada izin: edit nama, login ulang dan cek profil memuat nama baru dengan email tetap. Pengujian ini tidak mengubah status DM nyata atau izin Meta.
