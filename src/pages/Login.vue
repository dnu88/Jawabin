<script setup>
import { reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { t, locale, setLocale } from '../i18n'
import { signIn, signUp, signInWithGoogle } from '../auth'
import { showToast } from '../toast'

const route = useRoute()
const router = useRouter()
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
  <div class="w-full min-h-dvh bg-base-200/80 flex flex-col items-center justify-center gap-6 p-4">
    <div class="flex items-center gap-2">
      <span class="size-7 rounded-bubble [--bubble-r:0.5rem] bg-base-content text-base-100 flex items-center justify-center text-sm font-bold">J</span>
      <span class="text-lg font-semibold tracking-tight">Jawabin</span>
    </div>

    <form class="w-full max-w-sm bg-base-100 rounded-md p-6 flex flex-col gap-4" @submit.prevent="submit">
      <div class="flex flex-col gap-0.5">
        <h1 class="text-xl font-bold">{{ t(`auth.${state.mode}.title`) }}</h1>
        <p class="text-sm text-base-content/60">{{ t('auth.subtitle') }}</p>
      </div>

      <p v-if="state.notice" class="px-3 py-2 text-xs bg-base-200 rounded-bubble [--bubble-r:0.5rem]" role="status">{{ state.notice }}</p>

      <div v-if="state.mode == 'register'" class="flex flex-col gap-1">
        <label for="auth-name" class="text-xs text-base-content/70">{{ t('auth.name') }}</label>
        <input id="auth-name" v-model="state.name" type="text" class="w-full input" autocomplete="name" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="auth-email" class="text-xs text-base-content/70">{{ t('auth.email') }}</label>
        <input id="auth-email" v-model="state.email" type="email" class="w-full input" autocomplete="email" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="auth-password" class="text-xs text-base-content/70">{{ t('auth.password') }}</label>
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

      <span v-if="state.error" class="text-xs text-error" role="alert">{{ state.error }}</span>

      <button type="submit" class="btn btn-primary" :disabled="state.loading">
        <span v-if="state.loading" class="loading loading-xs" />
        {{ t(`auth.${state.mode}.button`) }}
      </button>

      <div class="flex items-center gap-3 text-xs text-base-content/50">
        <span class="flex-1 h-px bg-base-300" />
        {{ t('auth.or') }}
        <span class="flex-1 h-px bg-base-300" />
      </div>

      <button type="button" class="btn" @click="google">
        <Icon icon="logos:google-icon" />
        {{ t('auth.google') }}
      </button>

      <p class="text-center text-sm text-base-content/70">
        {{ t(`auth.${state.mode}.switch`) }}
        <button type="button" class="font-medium text-base-content underline underline-offset-2 cursor-pointer" @click="toggleMode">
          {{ t(`auth.${state.mode}.action`) }}
        </button>
      </p>
    </form>

    <div class="flex p-0.5 bg-base-200 rounded-bubble [--bubble-r:0.4rem]">
      <button
        v-for="code in ['en', 'id']"
        :key="code"
        class="px-2 py-0.5 text-xs font-medium uppercase rounded-bubble [--bubble-r:0.3rem] cursor-pointer"
        :class="locale == code ? 'bg-base-100 shadow-sm' : 'text-base-content/60'"
        @click="setLocale(code)"
      >
        {{ code }}
      </button>
    </div>
  </div>
</template>
