<script setup>
import { computed, ref } from 'vue'
import { Icon } from '@iconify/vue'
import { t, formatNumber, formatRelative, formatDate } from '../../../i18n'
import { showToast } from '../../../toast'

const props = defineProps({ doc: { type: Object, default: () => ({}) } })

const open = ref(false)
const rawOpen = ref(false)
const icons = { validate: 'mingcute:key-2-line', content: 'mingcute:ai-line', chat: 'mingcute:chat-3-line' }

const payload = computed(() => {
  try {
    return JSON.parse(props.doc.data || '{}') || {}
  } catch {
    return {}
  }
})
// Gemini-style and OpenAI-style payloads are both supported.
const output = computed(() => {
  const response = payload.value.response || {}
  return (response.candidates?.[0]?.content?.parts?.[0]?.text || response.choices?.[0]?.message?.content || '').trim()
})
const input = computed(() => {
  const request = payload.value.request || {}
  const lastUser = request.messages?.findLast?.((message) => message.role == 'user')?.content
  return String(request.contents?.[0]?.parts?.[0]?.text || lastUser || '').trim()
})
const model = computed(() => payload.value.response?.modelVersion || payload.value.response?.model || '')
const raw = computed(() => (Object.keys(payload.value).length ? JSON.stringify(payload.value) : String(props.doc.data || '')))
const expandable = computed(() => !!(input.value || output.value || model.value || raw.value))

async function copy() {
  await navigator.clipboard.writeText(raw.value)
  showToast(t('ai.history.copied'), 'success')
}
</script>

<template>
  <div class="w-full flex flex-col border-t border-base-200">
    <button
      type="button"
      class="w-full flex items-center gap-3 px-5 py-3 text-left"
      :class="{ 'cursor-pointer hover:bg-base-200/40': expandable }"
      :disabled="!expandable"
      :aria-expanded="expandable ? open : undefined"
      @click="open = !open"
    >
      <span class="shrink-0 size-9 rounded-bubble [--bubble-r:0.5rem] bg-base-200 flex justify-center items-center">
        <Icon :icon="icons[doc.type] || 'mingcute:ai-line'" />
      </span>
      <div class="flex-1 min-w-0">
        <div class="text-sm line-clamp-1 break-all" :class="output ? 'font-medium' : 'text-base-content/50'">
          {{ output || t('ai.history.none') }}
        </div>
        <div class="text-xs text-base-content/60 line-clamp-1">
          {{ t(`ai.summary.${doc.type}`) }} ·
          <span :title="formatDate(doc.createdAt)">{{ formatRelative(doc.createdAt) }}</span>
        </div>
      </div>
      <span class="shrink-0 text-sm font-semibold tabular-nums">{{ t('ai.history.tokens', { n: formatNumber(doc.token) }) }}</span>
      <Icon
        icon="mingcute:down-line"
        class="shrink-0 text-base-content/40 transition-transform"
        :class="{ invisible: !expandable, 'rotate-180': open }"
      />
    </button>

    <div v-if="open && expandable" class="w-full flex flex-col gap-3 px-5 pb-4 sm:pl-17">
      <div v-if="input" class="flex flex-col gap-1">
        <div class="text-xs text-base-content/60">{{ t('ai.history.input') }}</div>
        <div class="text-sm whitespace-pre-wrap wrap-anywhere">{{ input }}</div>
      </div>
      <div v-if="output" class="flex flex-col gap-1">
        <div class="text-xs text-base-content/60">{{ t('ai.history.output') }}</div>
        <div class="text-sm whitespace-pre-wrap wrap-anywhere">{{ output }}</div>
      </div>
      <div v-if="model" class="text-xs text-base-content/60">
        {{ t('ai.history.model') }} · <span class="font-mono">{{ model }}</span>
      </div>
      <div v-if="raw" class="flex flex-col gap-1.5">
        <div class="w-full flex items-center justify-between gap-3">
          <button
            type="button"
            class="flex items-center gap-1 text-xs text-base-content/70 cursor-pointer"
            :aria-expanded="rawOpen"
            @click="rawOpen = !rawOpen"
          >
            <Icon icon="mingcute:right-line" class="transition-transform" :class="{ 'rotate-90': rawOpen }" />
            {{ t('ai.history.raw') }}
          </button>
          <button v-if="rawOpen" class="btn btn-xs btn-ghost" @click="copy">
            <Icon icon="mingcute:copy-2-line" />
            {{ t('ai.history.copy') }}
          </button>
        </div>
        <pre
          v-if="rawOpen"
          class="max-h-60 overflow-auto p-3 bg-base-200 rounded-bubble [--bubble-r:0.625rem] text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-all"
        >{{ payload.response ? JSON.stringify(payload.response, null, 2) : raw }}</pre>
      </div>
    </div>
  </div>
</template>
