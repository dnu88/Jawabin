<script setup>
import { computed, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import Section from '../../../components/Section.vue'
import { t, formatNumber } from '../../../i18n'
import { user, updateAi } from '../../../api'
import { showToast } from '../../../toast'
import { providers } from './providers'

const emit = defineEmits(['save'])
const router = useRouter()
const saved = user.config.ai || {}

const state = reactive({
  loading: false,
  show: false,
  type: saved.type || 'gemini',
  url: saved.url || '',
  model: saved.model || '',
  token: saved.token || '',
  isProvided: saved.isProvided || false,
})

const sources = [
  { value: false, key: 'own', icon: 'mingcute:key-2-line' },
  { value: true, key: 'provided', icon: 'mingcute:coin-line' },
]

const provider = computed(() => providers.find((item) => item.value == state.type) || providers[0])

async function save() {
  if (state.loading) return
  state.loading = true
  try {
    await updateAi({
      type: state.type,
      url: provider.value.hasEndpoint ? state.url : '',
      model: state.model,
      token: state.token,
      isProvided: state.isProvided,
    })
    showToast(t('ai.form.toast'), 'success')
    emit('save')
  } catch (error) {
    showToast(error.message, 'error')
  }
  state.loading = false
}
</script>

<template>
  <Section icon="mingcute:ai-line" :title="t('ai.form.source')" :description="t('ai.form.sourceHint')">
    <div class="w-full grid sm:grid-cols-2 grid-cols-1 gap-2" role="radiogroup">
      <label
        v-for="source in sources"
        :key="source.key"
        class="w-full flex items-start gap-3 p-3.5 border rounded-bubble [--bubble-r:0.75rem] cursor-pointer transition-colors"
        :class="state.isProvided == source.value ? 'border-base-content bg-base-200/40' : 'border-base-300 hover:bg-base-200/60'"
      >
        <Icon :icon="source.icon" class="shrink-0 mt-0.5 text-lg" />
        <span class="flex-1 min-w-0 flex flex-col gap-0.5">
          <span class="text-sm font-medium">{{ t(`ai.form.${source.key}.title`) }}</span>
          <span class="text-xs text-base-content/60">{{ t(`ai.form.${source.key}.subtitle`) }}</span>
        </span>
        <input v-model="state.isProvided" type="radio" name="ai-source" class="shrink-0 radio radio-xs mt-1" :value="source.value" />
      </label>
    </div>

    <template v-if="state.isProvided">
      <div class="w-full flex items-center gap-3 p-4 bg-base-200/60 rounded-bubble [--bubble-r:0.75rem]">
        <div class="flex-1 min-w-0 flex flex-col gap-0.5">
          <div class="text-xs text-base-content/60">{{ t('ai.form.balance') }}</div>
          <div class="text-xl font-bold tabular-nums">
            {{ t('ai.form.tokens', { n: formatNumber(user.config.ai?.balance || 0) }) }}
          </div>
        </div>
        <button class="btn btn-sm" @click="router.push('/user/upgrade/ai')">
          <Icon icon="mingcute:add-line" />
          {{ t('ai.form.buy') }}
        </button>
      </div>
      <ul class="w-full flex flex-col gap-1.5 text-xs text-base-content/60">
        <li class="flex items-start gap-1.5">
          <Icon icon="mingcute:information-line" class="shrink-0 mt-px" />
          {{ t('ai.form.alert') }}
        </li>
        <li class="flex items-start gap-1.5">
          <Icon icon="mingcute:information-line" class="shrink-0 mt-px" />
          {{ t('ai.form.empty') }}
        </li>
      </ul>
    </template>

    <template v-else>
      <div class="w-full grid sm:grid-cols-2 grid-cols-1 gap-3">
        <div class="w-full flex flex-col gap-1">
          <label for="ai-provider" class="text-xs text-base-content/70">{{ t('ai.form.platform') }}</label>
          <select id="ai-provider" v-model="state.type" class="w-full select">
            <option v-for="item in providers" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </div>
        <div v-if="provider.hasEndpoint" class="w-full flex flex-col gap-1">
          <label for="ai-endpoint" class="text-xs text-base-content/70">{{ t('ai.form.endpoint') }}</label>
          <input id="ai-endpoint" v-model="state.url" type="url" :placeholder="t('ai.form.placeholder.endpoint')" class="w-full input" />
        </div>
      </div>

      <div class="w-full flex flex-col gap-1">
        <div class="w-full flex items-center justify-between gap-3">
          <label for="ai-key" class="text-xs text-base-content/70">{{ t('ai.form.key') }}</label>
          <a
            :href="provider.keysUrl"
            target="_blank"
            rel="noopener"
            class="flex items-center gap-1 text-xs underline underline-offset-2 text-base-content/70 hover:text-base-content"
          >
            {{ t('ai.form.getApiKey', { provider: provider.label }) }}
            <Icon icon="mingcute:external-link-line" />
          </a>
        </div>
        <label class="w-full input">
          <Icon icon="mingcute:key-2-line" class="text-base-content/50" />
          <input
            id="ai-key"
            v-model.trim="state.token"
            :type="state.show ? 'text' : 'password'"
            :placeholder="t('ai.form.placeholder.key')"
            class="w-full font-mono placeholder:font-sans"
            autocomplete="off"
          />
          <button
            type="button"
            class="cursor-pointer text-base-content/60 hover:text-base-content"
            :aria-label="state.show ? t('ai.form.hide') : t('ai.form.show')"
            @click="state.show = !state.show"
          >
            <Icon :icon="state.show ? 'mingcute:eye-close-line' : 'mingcute:eye-2-line'" />
          </button>
        </label>
      </div>

      <div class="w-full flex flex-col gap-1">
        <label for="ai-model" class="text-xs text-base-content/70">{{ t('ai.form.model') }}</label>
        <input
          id="ai-model"
          v-model="state.model"
          type="text"
          class="w-full input font-mono placeholder:font-sans"
          :placeholder="t('ai.form.placeholder.model')"
        />
        <div class="w-full flex flex-wrap gap-1.5 mt-1.5">
          <button
            v-for="model in provider.models"
            :key="model"
            type="button"
            class="btn btn-xs font-mono font-normal"
            :class="{ 'btn-primary': state.model == model }"
            @click="state.model = model"
          >
            {{ model }}
          </button>
        </div>
      </div>
    </template>

    <div class="w-full flex sm:flex-row flex-col sm:items-center gap-3 pt-4 border-t border-base-200">
      <p class="flex-1 text-xs text-base-content/60">
        <template v-if="!state.isProvided">{{ t('ai.form.test') }}</template>
      </p>
      <button class="btn btn-primary btn-sm" :disabled="state.loading" @click="save">
        <span v-if="state.loading" class="loading loading-xs" />
        {{ t('ai.form.button') }}
      </button>
    </div>
  </Section>
</template>
