<script setup>
import { reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { t, locale, setLocale } from '../i18n'
import { signIn, signUp, signInWithGoogle } from '../auth'
import { showToast } from '../toast'

const route = useRoute()
const router = useRouter()
// The Google button only appears once the provider is really configured in Supabase.
const googleEnabled = import.meta.env.VITE_GOOGLE_LOGIN == '1'
const state = reactive({ mode: 'login', loading: false, show: false, name: '', email: '', password: '', error: '', notice: '' })

function toggleMode() {
  state.mode = state.mode == 'login' ? 'register' : 'login'
  state.error = ''
  state.notice = ''
}

async function submit() {
  if (state.loading) return
  const isRegister = state.mode == 'register'
  state.notice = ''
  state.error = !state.email || !state.password || (isRegister && !state.name.trim()) ? t('auth.required')
    : isRegister && state.password.length < 8 ? t('auth.short') : ''
  if (state.error) return
  state.loading = true
  try {
    if (isRegister) {
      const signedIn = await signUp(state.name.trim(), state.email.trim(), state.password)
      if (!signedIn) {
        Object.assign(state, { mode: 'login', password: '', notice: t('auth.confirm') })
        state.loading = false
        return
      }
    } else {
      await signIn(state.email.trim(), state.password)
    }
    router.replace(String(route.query.next || '/user/setting/profile'))
  } catch (error) {
    state.error = error.message
  }
  state.loading = false
}

async function google() {
  try {
    await signInWithGoogle()
  } catch (error) {
    showToast(error.message, 'error')
  }
}
</script>

<template>
  <div class="w-full min-h-dvh bg-base-100 flex flex-col">
    <header class="w-full max-w-5xl mx-auto flex items-center justify-between gap-3 px-4 py-4">
      <RouterLink to="/" class="flex items-center gap-2">
        <span class="size-8 rounded-xl bg-base-content text-base-100 flex items-center justify-center text-sm font-bold">J</span>
        <span class="text-lg font-semibold tracking-tight">Jawabin</span>
      </RouterLink>
      <div class="flex items-center gap-1" role="group" aria-label="Language">
        <button
          v-for="code in ['id', 'en']"
          :key="code"
          class="btn btn-ghost btn-sm uppercase"
          :class="{ 'font-semibold': locale == code, 'text-base-content/50': locale != code }"
          @click="setLocale(code)"
        >
          {{ code }}
        </button>
      </div>
    </header>

    <main class="flex-1 w-full max-w-5xl mx-auto grid md:grid-cols-2 gap-10 items-center px-4 py-8">
      <section class="flex flex-col gap-4">
        <h1 class="text-3xl font-semibold tracking-tight">{{ t(`auth.${state.mode}.title`) }}</h1>
        <p class="text-base leading-relaxed text-base-content/70">{{ t('auth.subtitle') }}</p>
        <RouterLink to="/" class="link text-sm w-fit">{{ t('auth.about') }}</RouterLink>
      </section>

      <form class="w-full max-w-sm md:justify-self-end border border-base-300 rounded-2xl p-6 flex flex-col gap-4" @submit.prevent="submit">
        <p v-if="state.notice" class="px-3 py-2 text-sm bg-base-200 rounded-lg" role="status">{{ state.notice }}</p>

        <div v-if="state.mode == 'register'" class="flex flex-col gap-1">
          <label for="auth-name" class="text-sm font-medium">{{ t('auth.name') }}</label>
          <input id="auth-name" v-model="state.name" type="text" class="w-full input" autocomplete="name" />
        </div>
        <div class="flex flex-col gap-1">
          <label for="auth-email" class="text-sm font-medium">{{ t('auth.email') }}</label>
          <input id="auth-email" v-model="state.email" type="email" class="w-full input" autocomplete="email" />
        </div>
        <div class="flex flex-col gap-1">
          <label for="auth-password" class="text-sm font-medium">{{ t('auth.password') }}</label>
          <label class="w-full input">
            <input
              id="auth-password"
              v-model="state.password"
              :type="state.show ? 'text' : 'password'"
              class="w-full"
              :autocomplete="state.mode == 'register' ? 'new-password' : 'current-password'"
            />
            <button type="button" class="cursor-pointer text-base-content/60 hover:text-base-content" :aria-label="t('auth.password')" @click="state.show = !state.show">
              <Icon :icon="state.show ? 'mingcute:eye-2-line' : 'mingcute:eye-close-line'" />
            </button>
          </label>
          <span v-if="state.mode == 'register'" class="text-xs text-base-content/60">{{ t('auth.passwordHint') }}</span>
        </div>

        <span v-if="state.error" class="text-sm text-error" role="alert">{{ state.error }}</span>

        <button type="submit" class="btn btn-primary" :disabled="state.loading">
          <span v-if="state.loading" class="loading loading-xs" />
          {{ t(`auth.${state.mode}.button`) }}
        </button>

        <template v-if="googleEnabled">
          <div class="flex items-center gap-3 text-xs text-base-content/50">
            <span class="flex-1 h-px bg-base-300" />
            {{ t('auth.or') }}
            <span class="flex-1 h-px bg-base-300" />
          </div>
          <button type="button" class="btn" @click="google">
            <Icon icon="logos:google-icon" />
            {{ t('auth.google') }}
          </button>
        </template>

        <p v-if="state.mode == 'register'" class="text-xs text-base-content/60">{{ t('auth.agree') }}</p>

        <p class="text-sm text-base-content/70">
          {{ t(`auth.${state.mode}.switch`) }}
          <button type="button" class="font-medium text-base-content underline underline-offset-2 cursor-pointer" @click="toggleMode">
            {{ t(`auth.${state.mode}.action`) }}
          </button>
        </p>
      </form>
    </main>

    <footer class="w-full max-w-5xl mx-auto flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-6 text-sm text-base-content/60">
      <span>© Jawabin · Danu Budiarto</span>
      <RouterLink class="link" to="/privacy">{{ t('auth.privacy') }}</RouterLink>
      <RouterLink class="link" to="/terms">{{ t('auth.terms') }}</RouterLink>
    </footer>
  </div>
</template>
