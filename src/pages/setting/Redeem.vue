<script setup>
import { computed, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import Page from '../../components/Page.vue'
import Section from '../../components/Section.vue'
import { t, formatDay, capitalize } from '../../i18n'
import { user, redeemCode } from '../../api'
import { showToast } from '../../toast'
import { helpLinks } from '../../menu'

const route = useRoute()
const state = reactive({ loading: false, code: String(route.query.code || '') })
const support = helpLinks.find((link) => link.key == 'customerService').path

const errors = {
  'invalid code': 'redeem.error.invalid',
  'code has used': 'redeem.error.used',
  'invalid plan to redeem': 'redeem.error.plan',
  'cannot redeem own code': 'redeem.error.own',
  'user has referred': 'redeem.error.referred',
  'affiliate code has used': 'redeem.error.affiliateUsed',
  'current plan is higher': 'redeem.error.higher',
}

const current = computed(() => {
  if (!user.plan || user.plan == 'free') return t('redeem.free')
  const plan = capitalize(user.plan)
  return user.expiredAt ? `${plan}, ${t('redeem.until', { date: formatDay(user.expiredAt) })}` : plan
})

async function submit() {
  if (!state.code || state.loading) return
  state.loading = true
  try {
    const { data } = await redeemCode(state.code.trim().toUpperCase())
    showToast(t('redeem.toast', { plan: capitalize(data.plan), date: formatDay(data.expiredAt) }), 'success')
    state.code = ''
  } catch (error) {
    showToast(errors[error.message] ? t(errors[error.message]) : error.message, 'error')
  }
  state.loading = false
}
</script>

<template>
  <Page :title="t('redeem.title')" :description="t('setting.hint.redeem')">
    <Section
      icon="mingcute:coupon-line"
      :title="t('redeem.label')"
      :description="`${t('redeem.subtitle')} ${t('redeem.current', { plan: current })}.`"
    >
      <div class="w-full flex sm:flex-row flex-col gap-2">
        <input
          v-model="state.code"
          type="text"
          class="sm:flex-1 w-full min-w-0 input h-11 text-center text-base font-mono uppercase tracking-[0.3em] placeholder:tracking-[0.3em]"
          :placeholder="t('redeem.placeholder')"
          :aria-label="t('redeem.label')"
          autocomplete="off"
          spellcheck="false"
          @keyup.enter="submit"
        />
        <button class="btn btn-primary h-11 sm:w-32" :disabled="state.loading || !state.code" @click="submit">
          <span v-if="state.loading" class="loading loading-xs" />
          {{ t('redeem.button') }}
        </button>
      </div>
      <ul class="w-full flex flex-col gap-1.5 text-xs text-base-content/60">
        <li v-for="note in ['time', 'dynamic', 'once', 'affiliate']" :key="note" class="flex items-start gap-1.5">
          <Icon icon="mingcute:information-line" class="shrink-0 mt-px" />
          {{ t(`redeem.note.${note}`) }}
        </li>
      </ul>
      <div class="w-full pt-4 border-t border-base-200 text-xs text-base-content/60">
        {{ t('redeem.question.text') }}
        <a :href="support" class="inline-flex items-center gap-1 font-medium text-base-content underline underline-offset-2">
          <Icon icon="mingcute:whatsapp-line" />
          {{ t('redeem.question.action') }}
        </a>
      </div>
    </Section>
  </Page>
</template>
