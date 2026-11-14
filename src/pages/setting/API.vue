<script setup>
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import Page from '../../components/Page.vue'
import Section from '../../components/Section.vue'
import { t, tSplit, capitalize } from '../../i18n'
import { user, resetApiKeys, API_BASE } from '../../api'
import { showToast } from '../../toast'
import { confirm } from '../../confirm'
import { copyText } from '../../clipboard'

const loading = ref(false)
const show = ref(false)
const keys = computed(() => user.config.api || {})
const example = computed(() => `curl ${API_BASE}/public/me/addon \\\n  -u "${keys.value.accessKey}:${show.value ? keys.value.secretKey : '••••••••'}"`)
const copy = (text, label) => copyText(text, t('api.form.copied', { label }))

function reset() {
  confirm({
    title: t('api.reset.title'),
    message: t('api.reset.message'),
    onConfirm: async () => {
      loading.value = true
      try {
        await resetApiKeys()
        showToast(t('api.reset.toast'), 'success')
      } catch (error) {
        showToast(error.message, 'error')
      }
      loading.value = false
    },
  })
}

const endpoints = [
  { path: '/me', plans: ['standard', 'premium', 'gold'] },
  { path: '/account', plans: ['standard', 'premium', 'gold'] },
  { path: '/comment', plans: ['standard', 'premium', 'gold'] },
  { path: '/storage', plans: ['free', 'standard', 'premium', 'gold'] },
  { path: '/addon', plans: ['premium', 'gold'] },
  { path: '/schedule', plans: ['premium', 'gold'] },
  { path: '/chat', plans: ['gold'] },
  { path: '/content', plans: ['gold'] },
  { path: '/research', plans: ['gold'] },
  { path: '/report', plans: ['gold'] },
  { path: '/automation', plans: ['gold'] },
  { path: '/template', plans: ['gold'] },
]
const access = computed(() =>
  endpoints.map((item) => ({
    ...item,
    isAllowed: item.plans.includes(user.plan),
    plan: capitalize(item.plans.find((plan) => plan != 'free') || ''),
  })),
)

const flows = [
  { key: 'one', steps: ['one', 'two', 'three', 'four', 'five'] },
  { key: 'two', steps: ['one', 'two', 'three'] },
]
const stepText = (flow, step) => tSplit(`api.information.${flow}.step.${step}.subtitle`, 'code')
const hasCode = (flow, step) => t(`api.information.${flow}.step.${step}.subtitle`, { code: '\u0000' }).includes('\u0000')
</script>

<template>
  <Page :title="t('api.title')" :description="t('setting.hint.api')">
    <Section icon="mingcute:key-2-line" :title="t('api.form.keys')" :description="t('api.form.keysHint')">
      <div class="w-full flex flex-col gap-1">
        <label for="api-access" class="text-xs text-base-content/70">{{ t('api.form.accessKey') }}</label>
        <div class="w-full flex items-center gap-2">
          <input id="api-access" type="text" class="flex-1 min-w-0 input font-mono" readonly :value="keys.accessKey" />
          <button class="btn btn-square" :aria-label="t('api.form.copy')" :title="t('api.form.copy')" @click="copy(keys.accessKey, t('api.form.accessKey'))">
            <Icon icon="mingcute:copy-2-line" />
          </button>
        </div>
      </div>
      <div class="w-full flex flex-col gap-1">
        <label for="api-secret" class="text-xs text-base-content/70">{{ t('api.form.secretKey') }}</label>
        <div class="w-full flex items-center gap-2">
          <label class="flex-1 min-w-0 input">
            <input id="api-secret" :type="show ? 'text' : 'password'" class="w-full font-mono" readonly :value="keys.secretKey" />
            <button
              type="button"
              class="cursor-pointer text-base-content/60 hover:text-base-content"
              :aria-label="show ? t('api.form.hide') : t('api.form.show')"
              @click="show = !show"
            >
              <Icon :icon="show ? 'mingcute:eye-close-line' : 'mingcute:eye-2-line'" />
            </button>
          </label>
          <button class="btn btn-square" :aria-label="t('api.form.copy')" :title="t('api.form.copy')" @click="copy(keys.secretKey, t('api.form.secretKey'))">
            <Icon icon="mingcute:copy-2-line" />
          </button>
          <button class="btn text-error" :disabled="loading" @click="reset">
            <span v-if="loading" class="loading loading-xs" />
            <Icon v-else icon="mingcute:refresh-2-line" />
            <span class="sm:inline hidden">{{ t('api.form.reset') }}</span>
          </button>
        </div>
      </div>
      <div class="w-full flex flex-col gap-2 pt-4 border-t border-base-200">
        <div class="flex items-start gap-1.5 text-xs text-base-content/60">
          <Icon icon="mingcute:information-line" class="shrink-0 mt-px" />
          {{ t('api.form.auth') }}
        </div>
        <div class="relative">
          <pre class="w-full overflow-x-auto p-3 pr-12 bg-base-200 rounded-bubble [--bubble-r:0.625rem] text-xs leading-relaxed font-mono" :aria-label="t('api.form.example')">{{ example }}</pre>
          <button
            class="btn btn-xs btn-square absolute top-2 right-2"
            :aria-label="t('api.form.copy')"
            :title="t('api.form.copy')"
            @click="copy(example.replace('••••••••', keys.secretKey), t('api.form.example'))"
          >
            <Icon icon="mingcute:copy-2-line" />
          </button>
        </div>
      </div>
    </Section>

    <Section icon="mingcute:route-line" :title="t('api.plan.title')" :description="t('api.plan.subtitle')">
      <ul class="w-full grid sm:grid-cols-3 grid-cols-2 gap-1.5">
        <li
          v-for="item in access"
          :key="item.path"
          class="flex items-center justify-between gap-2 px-3 py-2 rounded-bubble [--bubble-r:0.5rem] text-xs"
          :class="item.isAllowed ? 'bg-base-200' : 'border border-dashed border-base-300'"
        >
          <span class="font-mono" :class="{ 'text-base-content/50': !item.isAllowed }">{{ item.path }}</span>
          <Icon v-if="item.isAllowed" icon="mingcute:check-line" class="shrink-0" />
          <span v-else class="shrink-0 flex items-center gap-1 text-base-content/50">
            <Icon icon="mingcute:lock-line" />
            {{ item.plan }}
          </span>
        </li>
      </ul>
    </Section>

    <Section icon="mingcute:link-line" :title="t('api.information.title')" :description="t('api.information.subtitle')">
      <div class="w-full grid sm:grid-cols-2 grid-cols-1 gap-3">
        <div v-for="flow in flows" :key="flow.key" class="w-full flex flex-col gap-3 p-4 border border-base-200 rounded-bubble [--bubble-r:0.75rem]">
          <h3 class="text-sm font-semibold">{{ t(`api.information.${flow.key}.title`) }}</h3>
          <ol class="flex flex-col gap-3">
            <li v-for="(step, index) in flow.steps" :key="step" class="flex items-start gap-2.5">
              <span class="shrink-0 size-5 mt-px rounded-bubble [--bubble-r:0.35rem] bg-base-200 flex justify-center items-center text-[11px] font-medium tabular-nums">
                {{ index + 1 }}
              </span>
              <span class="flex flex-col gap-0.5">
                <span class="text-sm font-medium">{{ t(`api.information.${flow.key}.step.${step}.title`) }}</span>
                <span class="text-xs text-base-content/60">
                  {{ stepText(flow.key, step).before }}<code v-if="hasCode(flow.key, step)" class="font-mono bg-base-200 text-base-content px-1 rounded">code</code>{{ stepText(flow.key, step).after }}
                </span>
              </span>
            </li>
          </ol>
        </div>
      </div>
    </Section>
  </Page>
</template>
