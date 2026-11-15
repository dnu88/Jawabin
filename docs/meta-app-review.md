# Bahan pengajuan App Review Meta

Draf untuk disalin ke formulir App Review. Sesuaikan dulu dengan yang benar-benar terjadi saat rekaman;
jangan mengirim klaim yang belum dicoba. Prasyarat: status Safe Browsing domain sudah bersih dan alur nyata
dengan akun tester sudah berhasil (PLAN.md → "Menuju live").

## Isian dasar aplikasi (App settings → Basic)

| Kolom | Isi |
| --- | --- |
| Privacy Policy URL | `https://DOMAIN/privacy` |
| Terms of Service URL | `https://DOMAIN/terms` |
| Data deletion instructions URL | `https://DOMAIN/data-deletion` |
| Kategori | Business and Pages |
| Email kontak | alamat yang sama dengan halaman Privasi |
| Ikon | 1024×1024, tanpa logo atau nama Instagram/Meta |

## Akun uji untuk peninjau

Peninjau harus bisa masuk tanpa bantuan. Siapkan satu akun Jawabin khusus peninjau yang sudah terhubung ke akun
Instagram uji, lalu tulis email dan kata sandinya di kolom instruksi (bukan di repo ini).

## Deskripsi pemakaian per izin

**instagram_basic**
Jawabin membaca ID, nama pengguna, nama, dan foto profil akun Instagram profesional yang dihubungkan pengguna.
Data itu ditampilkan di halaman Integrasi Akun supaya pengguna tahu akun mana yang tersambung, dan dipakai untuk
mencocokkan webhook yang masuk dengan akun yang benar.

**instagram_manage_comments**
Jawabin menerima komentar baru pada post milik akun yang terhubung lewat webhook, menampilkannya di halaman
Komentar, dan mengirim balasan atas nama akun itu. Balasan dikirim saat pengguna menulisnya sendiri, atau otomatis
berdasarkan aturan yang dibuat pengguna (kata kunci atau instruksi AI). Tanpa izin ini fungsi utama aplikasi
tidak berjalan.

**instagram_manage_messages**
Jawabin menerima pesan langsung yang dikirim orang ke akun yang terhubung, menampilkannya di halaman Percakapan,
dan mengirim balasan dalam jendela 24 jam, secara manual atau lewat aturan yang dibuat pengguna. Jawabin tidak
memulai percakapan dan tidak mengirim pesan massal.

## Urutan rekaman layar

Satu video per izin, atau satu video dengan penanda waktu. Tampilkan alamat situs di bilah browser.

1. Buka halaman depan, tunjukkan penjelasan layanan dan tautan Privasi, Ketentuan, Penghapusan Data.
2. Masuk dengan akun peninjau.
3. **instagram_basic** — Integrasi Akun → Hubungkan Instagram → layar persetujuan Meta → kembali ke Jawabin;
   tunjukkan nama pengguna dan foto akun yang tersambung.
4. **instagram_manage_comments** — dari akun Instagram lain, tulis komentar di post akun uji. Tunjukkan komentar
   muncul di halaman Komentar, balas secara manual, lalu tunjukkan balasannya di Instagram. Ulangi dengan satu
   aturan kata kunci aktif supaya terlihat balasan otomatis.
5. **instagram_manage_messages** — dari akun Instagram lain, kirim DM ke akun uji. Tunjukkan pesan muncul di
   halaman Percakapan, balas, lalu tunjukkan balasannya di Instagram.
6. Tunjukkan Integrasi Akun → Putuskan, dan Pengaturan → Profil → Hapus akun (cukup sampai dialog konfirmasi).

## Yang sering membuat pengajuan ditolak

- Peninjau tidak bisa masuk, atau domain memunculkan peringatan browser.
- Video tidak memperlihatkan layar persetujuan Meta, atau tidak memperlihatkan hasilnya di Instagram.
- Deskripsi menyebut fitur yang tidak ada di video.
- URL privasi atau penghapusan data tidak bisa dibuka tanpa login.
