# Safe Browsing: jalur Search Console (banding pemilik)

Domain: `jawabin-kc75.vercel.app`. Status Transparency Report
(`sb.ssr`) = **2** (ditandai), sementara `example.com` = 1 sebagai pembanding.
Kode, dependensi, dan isi halaman sudah diaudit tanpa temuan
(`docs/audit/safe-browsing-remediation.md`); yang belum diketahui adalah alasan
klasifikasinya, dan itu hanya terbaca dari akun Google pemilik.

## Prasyarat yang sudah tersedia di situs

- Halaman publik `/` menjelaskan layanan, operator, kontak, dan apa yang diakses.
- `/privacy`, `/terms`, `/data-deletion` berisi isi nyata dan dapat diakses tanpa sesi.
- `robots.txt` dan `sitemap.xml` kini file statis sungguhan (sebelumnya rewrite SPA
  membuat keduanya mengembalikan HTML — itu sendiri terlihat mencurigakan bagi crawler).
- Meta description + Open Graph terisi.
- Tidak ada script pihak ketiga selain Google Fonts; tidak ada `eval`, tidak ada
  pengalihan ke domain lain, OAuth memakai `state` bertanda tangan dan kembali ke origin sendiri.

## Langkah pemilik (satu sesi, ±10 menit)

1. Buka <https://search.google.com/search-console> → **Add property** → pilih
   **URL prefix** → isi `https://jawabin-kc75.vercel.app/`.
2. Pilih metode verifikasi **HTML file**, lalu **tekan Verify**. Tidak perlu mengunduh
   file, tidak perlu mengirim nama file ke siapa pun: server menjawab setiap permintaan
   `/google<token>.html` dengan baris yang dibaca Google
   (`server/routes/siteverify.js` + rewrite di `vercel.json`), jadi verifikasi selesai
   dalam satu klik. Diuji di produksi: `GET /google1a2b3c4d5e6f7a8b.html` →
   `200 text/html` berisi `google-site-verification: google1a2b3c4d5e6f7a8b.html`;
   nama yang tidak cocok pola → `404`.
3. Setelah properti terverifikasi: menu **Security & Manual Actions → Security issues**.
   Catat jenis temuan dan contoh URL bila ada.
4. Tekan **Request review** dan tempel teks di bawah (bahasa Inggris; peninjau Google
   memakai Inggris).

## Teks untuk Request review (salin apa adanya)

> This site is a small business tool, Jawabin, built by Danu Budiarto in Indonesia.
> It lets a shop connect its own Instagram professional account and answer the
> comments and direct messages that arrive there. Visitors can read what the
> service does, who operates it, and how to contact the operator on the home page,
> and the privacy policy, terms and data deletion instructions are public at
> /privacy, /terms and /data-deletion.
>
> There is no email, password or payment form on the public pages. Sign-in is
> handled by Supabase, and the Instagram connection uses Meta's own OAuth dialog;
> the app never asks for Instagram credentials. The site loads no third-party
> scripts apart from Google Fonts, contains no redirects to other domains, and does
> not host or promote downloadable software.
>
> The URL that may have triggered the flag is the OAuth callback
> (/api/instagram/callback), which receives a long code and state parameter from
> Meta and immediately redirects back to the app's own origin after verifying the
> signed state. That is normal OAuth behaviour, not an attempt to collect
> credentials.
>
> Recent changes: a public landing page describing the service and its operator,
> real privacy/terms/data-deletion pages, static robots.txt and sitemap.xml, and a
> hardened URL validation on the AI integration. No compromise was found in the
> code or deployment. I am requesting a review so Chrome users are not shown a
> warning for a site that only manages the owner's own Instagram comments and
> messages.

## Setelah status bersih

1. Jalankan `python3 scripts/review-readiness.py https://jawabin-kc75.vercel.app`
   sampai 8/8 lolos (cron harian "Jawabin review gate" juga memberi tahu sendiri).
2. Lanjut ke `docs/meta-app-review.md` — App Review untuk Advanced Access.
3. Jangan melewati interstitial dan jangan mengulang OAuth selama status masih ditandai;
   keduanya membuat klasifikasi makin sulit dicabut.
