<script setup>
import { computed } from 'vue'
import { useRoute, RouterLink } from 'vue-router'

const route = useRoute()
const isPrivacy = computed(() => route.name === 'privacy')

const sections = computed(() =>
  isPrivacy.value
    ? [
        {
          title: 'Data yang kami kumpulkan',
          body: 'Saat Anda mendaftar, kami menyimpan alamat email dan nama yang Anda isi. Saat Anda menghubungkan akun Instagram profesional, kami menyimpan nama pengguna, ID akun, foto profil, token akses terenkripsi, serta komentar dan pesan langsung yang diterima akun tersebut.',
        },
        {
          title: 'Cara kami memakai data',
          body: 'Data dipakai hanya untuk menampilkan komentar dan percakapan di dasbor Anda, menjalankan aturan balasan otomatis yang Anda buat, dan mencatat pemakaian AI. Kami tidak menjual data Anda dan tidak memakainya untuk iklan.',
        },
        {
          title: 'Penyimpanan dan keamanan',
          body: 'Data disimpan di Supabase (PostgreSQL) dengan aturan akses per pengguna. Token Instagram dan kunci API disimpan terenkripsi; kata sandi dikelola Supabase dengan hashing. Setiap permintaan API pengguna diverifikasi di server.',
        },
        {
          title: 'Berbagi dengan pihak ketiga',
          body: 'Kami mengirim permintaan ke Meta (Instagram Graph API) untuk membaca komentar/pesan dan mengirim balasan yang Anda setujui. Jika Anda memilih penyedia AI, isi pesan yang perlu dibalas dikirim ke penyedia yang Anda pilih dengan kunci API Anda sendiri.',
        },
        {
          title: 'Masa penyimpanan dan penghapusan',
          body: 'Anda dapat memutuskan akun Instagram kapan saja dari halaman Integrasi Akun, dan menghapus akun Jawabin dengan menghubungi kami. Setelah pemutusan, token akses dihapus sehingga Jawabin tidak bisa lagi membaca komentar atau pesan baru.',
        },
        {
          title: 'Kontak',
          body: 'Pertanyaan tentang data Anda: danubudiarto88@gmail.com. Kami menanggapi permintaan akses atau penghapusan data dalam waktu wajar.',
        },
      ]
    : [
        {
          title: 'Layanan',
          body: 'Jawabin adalah alat bantu untuk membalas komentar dan pesan langsung pada akun Instagram profesional. Layanan disediakan apa adanya; Anda tetap bertanggung jawab atas isi balasan yang dijalankan atas nama akun Anda.',
        },
        {
          title: 'Akun dan keamanan',
          body: 'Anda wajib menjaga kerahasiaan kata sandi akun Jawabin dan kunci API penyedia AI milik Anda. Laporkan segera jika mencurigai akses tidak sah.',
        },
        {
          title: 'Penggunaan yang dilarang',
          body: 'Dilarang memakai Jawabin untuk spam, penipuan, meniru identitas pihak lain, menyebarkan konten melanggar hukum, atau melanggar Ketentuan Platform Meta.',
        },
        {
          title: 'Ketersediaan',
          body: 'Layanan bergantung pada Meta, Supabase, dan Vercel sebagai penyedia pihak ketiga. Kami tidak menjamin layanan bebas gangguan dan dapat menghentikan fitur dengan pemberitahuan yang wajar.',
        },
        {
          title: 'Perubahan ketentuan',
          body: 'Ketentuan dapat diperbarui. Versi terbaru selalu tersedia di halaman ini, dan perubahan penting akan diumumkan di aplikasi.',
        },
        {
          title: 'Kontak',
          body: 'Pertanyaan tentang ketentuan ini: danubudiarto88@gmail.com.',
        },
      ],
)
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-10">
    <div class="flex items-center justify-between gap-3">
      <RouterLink class="flex items-center gap-2" to="/">
        <span class="grid h-9 w-9 place-items-center rounded-xl bg-neutral-900 font-bold text-white">J</span>
        <span class="text-lg font-semibold">Jawabin</span>
      </RouterLink>
      <RouterLink class="link text-sm" to="/">Kembali</RouterLink>
    </div>

    <h1 class="mt-8 text-2xl font-semibold">{{ isPrivacy ? 'Kebijakan Privasi' : 'Ketentuan Layanan' }}</h1>
    <p class="mt-2 text-sm text-neutral-500">Diperbarui 15 November 2026 · Berlaku untuk jawabin-kc75.vercel.app</p>

    <div class="mt-6 space-y-5">
      <section v-for="section in sections" :key="section.title">
        <h2 class="text-base font-semibold">{{ section.title }}</h2>
        <p class="mt-1 text-sm leading-relaxed text-neutral-600">{{ section.body }}</p>
      </section>
    </div>

    <p class="mt-8 border-t border-neutral-200 pt-4 text-sm text-neutral-500">
      Operator: Danu Budiarto (pengembang independen, Indonesia) ·
      <a class="link" href="mailto:danubudiarto88@gmail.com">danubudiarto88@gmail.com</a>
    </p>
  </div>
</template>
