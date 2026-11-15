# Google Safe Browsing: temuan dan remediasi

Tanggal: 2026-11-15. Domain: `jawabin-kc75.vercel.app` (deployment Vercel
`dnu88s-projects/jawabin-kc75`).

## Bukti yang dibaca

| Sumber | Hasil |
| --- | --- |
| Chrome (screenshot pemilik) | Interstitial **“Dangerous site”** muncul pada `…/api/instagram/callback`, memblokir penyelesaian OAuth |
| [Google Transparency Report](https://transparencyreport.google.com/safe-browsing/search?url=jawabin-kc75.vercel.app) | **“This site is unsafe”**, kategori: halaman yang mencoba menipu pengunjung agar membagikan info pribadi atau mengunduh software |
| Transparency Report untuk URL callback | Klasifikasi sama, jadi berlaku pada domain, bukan satu jalur saja |
| `curl` HTTPS + `/api/health` | 200, TLS valid — **tidak** membatalkan klasifikasi |
| `npm audit` (prod & dev) | 0 kerentanan terlapor |
| Pemindaian pola rahasia 17 commit | 0 kandidat |
| HTML live | Hanya bundle aplikasi sendiri + Google Fonts; tidak ada script pihak ketiga |
| Audit kode read-only | Tidak ditemukan pengalihan ke domain asing, form peniru, `eval`, atau `v-html` yang tidak aman; OAuth memakai state bertanda tangan dan callback kembali ke origin sendiri |
| Search Console | Belum bisa dibaca: butuh login pemilik Google |

Kesimpulan: tidak ada bukti kompromi pada kode, tetapi **alasan klasifikasi Google
belum diketahui**. Ketiadaan bukti bukan bukti aman.

## Pemicu yang mungkin (hipotesis, bukan klaim)

1. Deployment `*.vercel.app` yang menyajikan **formulir email+kata sandi langsung
   di halaman pertama**, tanpa halaman publik yang menjelaskan operator, tujuan
   layanan, kebijakan privasi, atau alasan meminta akses Instagram. Pola ini
   menyerupai halaman pengumpul kredensial bagi klasifikasi otomatis.
2. Callback OAuth dengan parameter panjang (`code`/`state`) yang dibuka langsung,
   yang oleh pemindai dapat terlihat seperti pengalihan dengan parameter rahasia.

## Perubahan repo (malam ini)

- Halaman publik baru `src/pages/Home.vue`: menjelaskan layanan, operator,
  kontak, apa yang diakses, dan cara kerja sebelum pengunjung melihat formulir
  masuk; tersedia ID/EN; menautkan privasi dan ketentuan.
- Halaman publik `src/pages/Legal.vue` di `/privacy` dan `/terms` dengan isi nyata
  (data yang dikumpulkan, pemakaian, penyimpanan, pihak ketiga, penghapusan,
  kontak).
- Router: `/` menjadi halaman publik; `/login`, `/privacy`, `/terms` boleh diakses
  tanpa sesi; rute lain tetap butuh login.
- Uji: `tests/e2e/demo.spec.js` memeriksa halaman publik (bukan langsung dashboard)
  dan kedua halaman legal; total **190 unit + 32 e2e** hijau; build sukses.

## Perbaikan keamanan tambahan (ditemukan saat audit)

- `server/ai.js` `checkEndpoint` kini **async** dan memeriksa hasil DNS: hostname
  yang terlihat publik tetapi resolve ke loopback/privat (mis. `127.0.0.1.nip.io`)
  ditolak, termasuk IPv6 privat, link-local metadata `169.254.169.254`, dan
  jawaban DNS campuran.
- `post()` memakai `redirect: 'error'` sehingga permintaan tidak diikuti ke
  tujuan lain, dan pesan galat penyedia diredaksi (URL dan kunci API tidak lagi
  diteruskan ke klien). Uji regresi ada di `tests/unit/ai-endpoint.test.js`.
- `server/routes/ai.js` menunggu `checkEndpoint` (kini async).

## Langkah pemilik (belum bisa dikerjakan agen)

1. Buka [Search Console](https://search.google.com/search-console) → properti
   `jawabin-kc75.vercel.app` → **Security & Manual Actions → Security issues**;
   catat jenis temuan dan contoh URL.
2. Bila ada contoh URL, periksa apakah aset itu berasal dari commit ini; deployment
   Vercel sebelumnya dapat diperiksa dari daftar deployment.
3. Setelah deployment baru (halaman publik + perbaikan di atas) aktif, tekan
   **Request review** dan jelaskan: layanan milik Danu Budiarto, halaman publik
   beserta privasi/ketentuan, tidak ada script pihak ketiga, serta tidak ada
   pengalihan ke domain lain.
4. Jangan melewati interstitial dan jangan mengulang OAuth sampai status domain
   bersih.

## Batas

Dokumen ini tidak menyatakan situs sudah aman. Status Safe Browsing harus dibaca
ulang setelah review Google; sampai itu terjadi, OAuth dan login pengguna baru
tetap ditahan.
