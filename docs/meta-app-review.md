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

## English answers for the review form (paste as-is)

Meta reviewers read English. The Indonesian text above is the reasoning; the
blocks below are what goes into the form.

### instagram_basic

> Jawabin shows a user which Instagram professional account is connected and
> keeps incoming webhooks matched to that account. It reads the account id,
> username, name and profile picture of accounts the user connects themselves,
> and displays them on the Account Integration page. Nothing is read from
> accounts the user has not connected.

### instagram_manage_comments

> Jawabin receives new comments on media owned by the connected account through
> the webhook, lists them on the Comments page, and posts replies as that
> account. A reply is sent either when the user writes it, or automatically from
> a rule the user creates (keyword or AI instruction). The reviewer will see one
> manual reply and one keyword reply in the screencast.

### instagram_manage_messages

> Jawabin receives direct messages that people send to the connected account,
> shows them on the Conversations page, and replies within the 24-hour window,
> either manually or through a rule the user created. Jawabin never starts a
> conversation and never sends bulk or promotional messages.

### How the app uses each permission (short form field)

> Comments and messages arrive through webhooks for the single Instagram
> professional account each user connects; replies are published only on that
> account, only in response to an inbound comment or message, and only when the
> user sends them or an active rule fires.

## Pre-submission gate

Run this before touching the review form; it answers everything Meta can see
from outside without a session:

```
python3 scripts/review-readiness.py https://<domain>
```

Exit code 0 means every machine-checkable item passes. It deliberately fails on
a Google Safe Browsing flag, because a reviewer who meets the interstitial will
reject the submission without opening the app.

## Status bukti per 2026-11-16

Yang sudah bisa dipakai sebagai lampiran (bukan klaim, tapi jejak produksi):

| Izin | Bukti |
| --- | --- |
| `instagram_manage_comments` | delivery `id 6` (`comment:stored`, HTTP 200), komentar `@trasistydevi` tersimpan, dibalas lewat app → `status=resolved`, `error=''`, balasan terlihat di Instagram |
| `instagram_basic` | `account_checks` menyimpan `username`, `subscribed=true`, `fields=[comments,messages]`, `token_app_id=1128649916573434` |
| `instagram_manage_messages` | **belum ada** — DM dari akun non-peran tidak pernah sampai; ini justru alasan pengajuan Advanced Access |

## Pengajuan Advanced Access untuk messaging

`instagram_manage_messages` adalah satu-satunya izin yang tertahan. Urutannya:

1. **Rekam dulu, jangan mengisi form lebih dulu.** Satu rekaman layar 2–3 menit, berbahasa
   Indonesia dengan teks Inggris di layar bila perlu, isinya berurutan:
   - 0:00 – 0:20 · buka `jawabin-kc75.vercel.app`, tunjukkan halaman **Akun** dengan
     `@danubudiarto` terhubung dan baris "Webhook aktif (comments,messages)".
   - 0:20 – 1:10 · halaman **Komentar**: tunjukkan komentar masuk hari ini dari `@trasistydevi`,
     tekan balas, kirim, lalu tunjukkan balasan itu muncul di aplikasi Instagram (rekam dari HP
     atau tunjukkan tangkapan layar di akhir).
   - 1:10 – 1:50 · halaman **Percakapan** dan halaman **Otomasi**: tunjukkan aturan kata kunci
     "DM uji halo" (kata `halo` → balas "Halo juga", kanal DM) dan jelaskan bahwa balasan hanya
     dikirim untuk pesan yang masuk ke akun sendiri, bukan pesan keluar massal.
   - 1:50 – 2:30 · tunjukkan halaman `/privacy`, `/terms`, `/data-deletion` (yang ditanyakan
     peninjau untuk aplikasi messaging) dan sebutkan bahwa aplikasi tidak menyimpan password
     Instagram.
2. **Isi form** di https://developers.facebook.com/apps/1128649916573434/app-review/permissions/
   untuk `instagram_manage_messages` (ajukan `instagram_manage_comments` sekaligus supaya tidak
   dua kali antre). Deskripsi pakai blok Inggris di bagian atas dokumen ini.
3. **Jujur soal pengujian.** Di kolom catatan untuk peninjau, tulis kalimat ini apa adanya:

   > With Standard Access our tester account can comment and receive replies end to end, but
   > direct messages from the same tester are never delivered to our webhook, even though the
   > app-level and account-level subscriptions both report `messages` active. We are applying for
   > Advanced Access precisely because we cannot demonstrate inbound DMs until it is granted.

   Itu bukan kelemahan pengajuan; itu bukti bahwa kami tahu apa yang sedang diminta.
4. **Business verification.** Kalau dashboard menandai app belum terverifikasi, selesaikan dulu
   (dokumen badan usaha/NIB + situs dengan halaman legal). Tanpa itu, antrean messaging biasanya
   berhenti di tahap awal.

## Setelah Advanced Access disetujui

1. Kirim satu DM dari akun lain → watcher harus melapor `chat`/`messages` bertambah.
2. Kalau belum, jalankan `GET /api/cron/accounts` (memperbaiki langganan) lalu uji lagi.
3. Baru setelah itu promosi/otomasi DM untuk pelanggan nyata boleh dinyalakan.

