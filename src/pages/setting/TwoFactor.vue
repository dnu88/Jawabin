<script setup>
import { computed, reactive } from 'vue'
import { Icon } from '@iconify/vue'
import Page from '../../components/Page.vue'
import Section from '../../components/Section.vue'
import { t } from '../../i18n'
import { user, generateTwoFactor, verifyTwoFactor, removeTwoFactor } from '../../api'
import { showToast } from '../../toast'
import { confirm } from '../../confirm'

const active = computed(() => !!user.config.twoFactor?.isActive)
const state = reactive({ loading: false, qrcode: '', code: '' })
const badge = 'shrink-0 size-6 rounded-bubble [--bubble-r:0.4rem] flex justify-center items-center text-xs font-medium tabular-nums'

async function generate() {
  state.loading = true
  state.code = ''
  try {
    const { data } = await generateTwoFactor()
    state.qrcode = data.qrcode
  } catch (error) {
    showToast(error.message, 'error')
  }
  state.loading = false
}

async function verify() {
  if (!state.code || state.loading) return
  state.loading = true
  try {
    await verifyTwoFactor(state.code)
    showToast(t('setting.twofactor.toast.saved'), 'success')
    state.qrcode = ''
    state.code = ''
  } catch (error) {
    showToast(error.message, 'error')
  }
  state.loading = false
}

function remove() {
  confirm({
    title: t('setting.twofactor.remove.title'),
    message: t('setting.twofactor.remove.message'),
    onConfirm: async () => {
      try {
        await removeTwoFactor()
        showToast(t('setting.twofactor.toast.removed'), 'success')
      } catch (error) {
        showToast(error.message, 'error')
      }
    },
  })
}
</script>

<template>
  <Page :title="t('setting.twofactor.title')" :description="t('setting.twofactor.alert')">
    <Section v-if="active" icon="mingcute:safe-lock-line" :title="t('setting.twofactor.on.title')" :description="t('setting.twofactor.on.subtitle')">
      <template #action>
        <span class="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-primary text-primary-content rounded-bubble [--bubble-r:0.4rem]">
          {{ t('setting.twofactor.status.on') }}
        </span>
      </template>
      <div class="w-full flex justify-end border-t border-base-200 pt-4">
        <button class="btn btn-sm text-error" @click="remove">{{ t('setting.twofactor.button.remove') }}</button>
      </div>
    </Section>

    <Section v-else icon="mingcute:safe-lock-line" :title="t('setting.twofactor.off.title')" :description="t('setting.twofactor.off.subtitle')">
      <template #action>
        <span class="flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-base-200 rounded-bubble [--bubble-r:0.4rem]">
          {{ t('setting.twofactor.status.off') }}
        </span>
      </template>
      <ol class="w-full flex flex-col border-t border-base-200">
        <li class="w-full flex gap-3 py-4">
          <span :class="[badge, state.qrcode ? 'bg-base-200' : 'bg-primary text-primary-content']">1</span>
          <div class="flex-1 min-w-0 flex flex-col gap-3">
            <div class="flex flex-col gap-0.5">
              <div class="text-sm font-medium">{{ t('setting.twofactor.step.scan.title') }}</div>
              <div class="text-xs text-base-content/60">{{ t('setting.twofactor.step.scan.subtitle') }}</div>
            </div>
            <div v-if="state.qrcode" class="flex sm:flex-row flex-col sm:items-end gap-3">
              <div class="shrink-0 size-44 p-2 bg-white border border-base-200 rounded-bubble [--bubble-r:0.75rem] overflow-hidden">
                <img :src="state.qrcode" class="size-full" alt="" />
              </div>
              <div class="flex flex-col items-start gap-2">
                <span class="text-xs text-base-content/60 max-w-60">{{ t('setting.twofactor.step.scan.again') }}</span>
                <button class="btn btn-sm" :disabled="state.loading" @click="generate">
                  <span v-if="state.loading && !state.code" class="loading loading-xs" />
                  <Icon v-else icon="mingcute:refresh-2-line" />
                  {{ t('setting.twofactor.button.regenerate') }}
                </button>
              </div>
            </div>
            <div v-else class="size-44 bg-base-200 rounded-bubble [--bubble-r:0.75rem] flex flex-col justify-center items-center gap-3">
              <Icon icon="mingcute:qrcode-line" class="text-5xl text-base-content/20" />
              <button class="btn btn-sm btn-primary" :disabled="state.loading" @click="generate">
                <span v-if="state.loading" class="loading loading-xs" />
                {{ t('setting.twofactor.button.generate') }}
              </button>
            </div>
          </div>
        </li>
        <li class="w-full flex gap-3 pt-4 border-t border-base-200" :class="{ 'opacity-50': !state.qrcode }">
          <span :class="[badge, state.qrcode ? 'bg-primary text-primary-content' : 'bg-base-200']">2</span>
          <div class="flex-1 min-w-0 flex flex-col gap-3">
            <div class="flex flex-col gap-0.5">
              <label for="twofactor-code" class="text-sm font-medium">{{ t('setting.twofactor.step.code.title') }}</label>
              <div class="text-xs text-base-content/60">{{ t('setting.twofactor.step.code.subtitle') }}</div>
            </div>
            <div class="w-full flex sm:flex-row flex-col gap-2">
              <input
                id="twofactor-code"
                v-model="state.code"
                type="text"
                inputmode="numeric"
                autocomplete="one-time-code"
                maxlength="6"
                class="input sm:w-44 w-full text-center text-lg tracking-[0.5em] tabular-nums"
                :placeholder="t('setting.twofactor.form.code.placeholder')"
                :aria-label="t('setting.twofactor.form.code.label')"
                :disabled="!state.qrcode"
                @keyup.enter="verify"
              />
              <button class="btn btn-primary" :disabled="state.loading || !state.qrcode || !state.code" @click="verify">
                <span v-if="state.loading && state.code" class="loading loading-xs" />
                {{ t('setting.twofactor.button.verify') }}
              </button>
            </div>
          </div>
        </li>
      </ol>
    </Section>

    <div class="flex items-start gap-2 px-1 text-xs text-base-content/60">
      <Icon icon="mingcute:user-security-line" class="shrink-0 mt-px text-sm" />
      {{ t('setting.twofactor.operator') }}
    </div>
  </Page>
</template>
