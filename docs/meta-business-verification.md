# Verifikasi bisnis Meta — berkas yang perlu disiapkan

App: `1128649916573434` (Jawabin Testing). Verifikasi bisnis diminta Meta sebelum Advanced Access
untuk messaging biasanya diproses, dan antreannya harian — jadi ini yang paling awal harus jalan.

## Kenyataan yang harus dijawab dulu

Jawabin dijalankan sebagai **pengembang independen** (Danu Budiarto), bukan badan usaha berbadan
hukum. Meta punya dua jalur dan pilihannya menentukan dokumen:

- **Punya badan usaha** (PT/CV/UD dengan NIB): pilih verifikasi badan usaha, unggah NIB + akta, dan
  pastikan **nama serta alamat** di dokumen sama dengan yang diisi di Business Manager.
- **Belum ada badan usaha**: Meta tetap mengizinkan verifikasi sebagai individu/perorangan dengan
  dokumen identitas (KTP) dan bukti kegiatan usaha (mis. NPWP, rekening usaha, atau halaman situs
  yang menyebut operator). Jalur ini lebih sering diminta dokumen tambahan, jadi siapkan semuanya
  sebelum mulai.

Kalau keduanya belum ada, jangan mengarang data: verifikasi yang ditolak karena data tidak cocok
lebih lambat daripada menunggu dokumen siap.

## Isian yang sudah konsisten dengan situs

Nilai-nilai ini sudah terpasang di halaman publik dan sebaiknya dipakai apa adanya saat mengisi form:

- Nama operator: **Danu Budiarto**
- Negara: **Indonesia**
- Kontak: **danubudiarto88@gmail.com**
- Situs: `https://jawabin-kc75.vercel.app`
- Kebijakan privasi: `https://jawabin-kc75.vercel.app/privacy`
- Ketentuan layanan: `https://jawabin-kc75.vercel.app/terms`
- Instruksi penghapusan data: `https://jawabin-kc75.vercel.app/data-deletion`

Meta mencocokkan nama dan alamat pada dokumen dengan yang diisi. Karena itu, kalau memakai KTP,
isi nama persis seperti di KTP, bukan nama merek.

## Urutan singkat

1. Buka **Business settings → Business info** di https://business.facebook.com/settings/info/ dan
   lengkapi nama, alamat, telepon, situs.
2. Buka **Security Center → Start verification** (atau tautan verifikasi yang muncul di App
   Dashboard) dan unggah dokumen.
3. Tunggu email Meta. Sambil menunggu, jangan ubah nama/alamat bisnis — perubahan membatalkan antrean.
4. Setelah terverifikasi, baru ajukan Advanced Access (`docs/meta-app-review.md`).

## Yang tidak perlu diulang

- Halaman legal sudah berisi identitas operator dan kontak (bukan placeholder).
- Domain belum bersih dari tanda Safe Browsing; itu urusan terpisah dan dipantau
  `scripts/review-readiness.py` + cron harian.
