<script setup>
import { computed, reactive } from 'vue'
import { Icon } from '@iconify/vue'
import Page from '../../components/Page.vue'
import Section from '../../components/Section.vue'
import { t, tSplit } from '../../i18n'
import { user, updateTikwm } from '../../api'
import { showToast } from '../../toast'

const state = reactive({ loading: false, show: false, error: false, apiKey: user.config.tikwm?.apiKey || '' })
const hasKey = computed(() => !!user.config.tikwm?.apiKey)
const steps = ['one', 'two', 'three', 'four', 'five']

async function save() {
  state.error = !state.apiKey.trim()
  if (state.error || state.loading) return
  state.loading = true
  try {
    await updateTikwm(state.apiKey.trim())
    showToast(t('tikwm.toast'), 'success')
  } catch (error) {
    showToast(error.message, 'error')
  }
  state.loading = false
}
</script>

<template>
  <Page :title="t('tikwm.title')" :description="t('setting.hint.tikwm')">
    <Section icon="mingcute:key-2-line" :title="t('tikwm.form.title')" :description="t('tikwm.form.subtitle')">
      <template #action>
        <span
          class="flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-bubble [--bubble-r:0.4rem]"
          :class="hasKey ? 'bg-primary text-primary-content' : 'bg-base-200'"
        >
          {{ hasKey ? t('tikwm.form.saved') : t('tikwm.form.missing') }}
        </span>
      </template>

      <div class="w-full flex flex-col gap-1">
        <label for="tikwm-key" class="text-xs text-base-content/70">{{ t('tikwm.form.apiKey.label') }}</label>
        <label class="input w-full" :class="{ 'input-error': state.error }">
          <input
            id="tikwm-key"
            v-model="state.apiKey"
            :type="state.show ? 'text' : 'password'"
            :placeholder="t('tikwm.form.apiKey.placeholder')"
            class="w-full font-mono placeholder:font-sans"
            autocomplete="off"
            @keyup.enter="save"
          />
          <button
            type="button"
            class="cursor-pointer text-base-content/60 hover:text-base-content"
            :aria-label="state.show ? t('tikwm.form.hide') : t('tikwm.form.show')"
            @click="state.show = !state.show"
          >
            <Icon :icon="state.show ? 'mingcute:eye-close-line' : 'mingcute:eye-2-line'" />
          </button>
        </label>
        <span v-if="state.error" class="text-xs text-error">{{ t('tikwm.form.apiKey.validation.required') }}</span>
      </div>

      <div class="w-full flex sm:flex-row flex-col sm:items-center gap-3 pt-4 border-t border-base-200">
        <p class="flex-1 text-xs text-base-content/60">{{ t('tikwm.form.check') }}</p>
        <div class="flex items-center gap-2">
          <RouterLink v-if="hasKey" to="/user/research/tiktok" class="btn btn-sm sm:flex-none flex-1 whitespace-nowrap">
            {{ t('tikwm.form.research') }}
          </RouterLink>
          <button class="btn btn-primary btn-sm sm:flex-none flex-1" :disabled="state.loading" @click="save">
            <span v-if="state.loading" class="loading loading-xs" />
            {{ t('tikwm.form.button') }}
          </button>
        </div>
      </div>
    </Section>

    <Section icon="mingcute:information-line" :title="t('tikwm.info.title')">
      <ol class="w-full flex flex-col gap-2.5">
        <li v-for="(step, index) in steps" :key="step" class="flex items-center gap-2.5 text-sm">
          <span class="shrink-0 size-5 rounded-bubble [--bubble-r:0.35rem] bg-base-200 flex justify-center items-center text-[11px] font-medium tabular-nums">
            {{ index + 1 }}
          </span>
          <span>
            {{ tSplit(`tikwm.info.point.${step}`, 'link').before }}
            <a
              v-if="step == 'one'"
              href="https://tikwmapi.com"
              target="_blank"
              rel="noopener"
              class="inline-flex items-center gap-0.5 font-medium underline underline-offset-2"
            >
              tikwmapi.com
              <Icon icon="mingcute:external-link-line" class="text-xs" />
            </a>
            {{ tSplit(`tikwm.info.point.${step}`, 'link').after }}
          </span>
        </li>
      </ol>
    </Section>
  </Page>
</template>
