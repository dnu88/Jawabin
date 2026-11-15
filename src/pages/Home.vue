<script setup>
import { ref } from 'vue'
import { authEnabled } from '../auth'

const lang = ref(localStorage.getItem('lang') || 'id')
const setLang = (next) => {
  lang.value = next
  localStorage.setItem('lang', next)
}

const copy = {
  id: {
    kicker: 'Jawabin',
    title: 'Balasan otomatis untuk komentar dan DM Instagram',
    lead: 'Jawabin adalah layanan web yang membantu pemilik akun Instagram profesional membalas komentar dan pesan langsung secara otomatis memakai aturan kata kunci atau AI.',
    operator: 'Dijalankan oleh Danu Budiarto sebagai pengembang independen di Indonesia. Kontak: danubudiarto88@gmail.com.',
    how: 'Cara kerja',
    steps: [
      'Anda membuat akun Jawabin dengan email dan kata sandi.',
      'Anda menghubungkan akun Instagram profesional melalui login resmi Meta (Facebook atau Instagram).',
      'Jawabin hanya meminta izin membaca profil, komentar, dan pesan langsung untuk akun yang Anda hubungkan.',
      'Jawabin menyimpan balasan dan menampilkannya di dasbor Anda; Anda bisa memutuskan koneksi kapan saja.',
    ],
    data: 'Apa yang kami akses',
    dataPoints: [
      'Profil Instagram yang Anda hubungkan: nama, nama pengguna, dan foto profil.',
      'Komentar pada konten akun Anda dan pesan langsung yang masuk ke akun Anda.',
      'Tidak ada akses ke kata sandi Instagram Anda: login diproses oleh Meta, bukan oleh Jawabin.',
    ],
    security: 'Keamanan',
    securityText: 'Token akses disimpan terenkripsi di server. Kata sandi akun Jawabin disimpan oleh penyedia autentikasi (Supabase) dengan hashing, bukan teks biasa.',
    login: 'Masuk ke Jawabin',
    register: 'Buat akun',
    privacy: 'Kebijakan Privasi',
    terms: 'Ketentuan Layanan',
    demo: 'Coba mode demo tanpa akun',
  },
  en: {
    kicker: 'Jawabin',
    title: 'Automatic replies for Instagram comments and DMs',
    lead: 'Jawabin is a web service that helps professional Instagram account owners reply to comments and direct messages automatically using keyword rules or AI.',
    operator: 'Operated by Danu Budiarto, an independent developer based in Indonesia. Contact: danubudiarto88@gmail.com.',
    how: 'How it works',
    steps: [
      'You create a Jawabin account with an email address and password.',
      'You connect your professional Instagram account through Meta’s official login (Facebook or Instagram).',
      'Jawabin only requests permission to read your profile, comments and direct messages for the account you connect.',
      'Jawabin stores replies and shows them in your dashboard; you can disconnect at any time.',
    ],
    data: 'What we access',
    dataPoints: [
      'The Instagram profile you connect: name, username and profile picture.',
      'Comments on your account’s content and direct messages sent to your account.',
      'We never see your Instagram password: login is handled by Meta, not Jawabin.',
    ],
    security: 'Security',
    securityText: 'Access tokens are stored encrypted on the server. Your Jawabin password is stored by the authentication provider (Supabase) as a hash, never as plain text.',
    login: 'Sign in to Jawabin',
    register: 'Create account',
    privacy: 'Privacy Policy',
    terms: 'Terms of Service',
    demo: 'Try demo mode without an account',
  },
}
const text = () => copy[lang.value]
</script>

<template>
  <div class="mx-auto max-w-3xl px-4 py-10">
    <header class="flex items-center justify-between gap-3">
      <div class="flex items-center gap-2">
        <span class="grid h-9 w-9 place-items-center rounded-xl bg-neutral-900 font-bold text-white">J</span>
        <span class="text-lg font-semibold">{{ text().kicker }}</span>
      </div>
      <div class="flex items-center gap-1 text-sm">
        <button class="btn btn-ghost btn-sm" @click="setLang('id')" :class="{ 'font-semibold': lang === 'id' }">ID</button>
        <button class="btn btn-ghost btn-sm" @click="setLang('en')" :class="{ 'font-semibold': lang === 'en' }">EN</button>
      </div>
    </header>

    <main class="mt-8 space-y-8">
      <section>
        <h1 class="text-2xl font-semibold leading-tight">{{ text().title }}</h1>
        <p class="mt-3 text-sm leading-relaxed text-neutral-600">{{ text().lead }}</p>
        <p class="mt-2 text-sm leading-relaxed text-neutral-500">{{ text().operator }}</p>
        <div class="mt-5 flex flex-wrap gap-2">
          <RouterLink v-if="authEnabled" class="btn btn-sm" to="/login">{{ text().login }}</RouterLink>
          <RouterLink v-if="authEnabled" class="btn btn-sm btn-outline" to="/login">{{ text().register }}</RouterLink>
          <RouterLink v-if="!authEnabled" class="btn btn-sm" to="/user/dashboard">{{ text().demo }}</RouterLink>
        </div>
      </section>

      <section>
        <h2 class="text-base font-semibold">{{ text().how }}</h2>
        <ol class="mt-2 list-decimal space-y-1 pl-5 text-sm leading-relaxed text-neutral-600">
          <li v-for="step in text().steps" :key="step">{{ step }}</li>
        </ol>
      </section>

      <section>
        <h2 class="text-base font-semibold">{{ text().data }}</h2>
        <ul class="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-neutral-600">
          <li v-for="point in text().dataPoints" :key="point">{{ point }}</li>
        </ul>
      </section>

      <section>
        <h2 class="text-base font-semibold">{{ text().security }}</h2>
        <p class="mt-2 text-sm leading-relaxed text-neutral-600">{{ text().securityText }}</p>
      </section>

      <footer class="flex flex-wrap gap-3 border-t border-neutral-200 pt-4 text-sm">
        <RouterLink class="link" to="/privacy">{{ text().privacy }}</RouterLink>
        <RouterLink class="link" to="/terms">{{ text().terms }}</RouterLink>
        <a class="link" href="mailto:danubudiarto88@gmail.com">danubudiarto88@gmail.com</a>
      </footer>
    </main>
  </div>
</template>
