<script setup>
import { computed, onMounted, reactive } from 'vue'
import Section from '../../../components/Section.vue'
import { t, formatNumber } from '../../../i18n'
import { getUsageSummary } from '../../../api'
import { showToast } from '../../../toast'

const state = reactive({ loading: true, data: { total: 0, content: 0, chat: 0, validate: 0 } })

const rows = computed(() =>
  ['content', 'validate', 'chat'].map((key) => ({
    key,
    value: state.data[key] || 0,
    share: state.data.total ? ((state.data[key] || 0) / state.data.total) * 100 : 0,
  })),
)

onMounted(async () => {
  try {
    const { data } = await getUsageSummary()
    state.data = data
  } catch (error) {
    showToast(error.message, 'error')
  }
  state.loading = false
})
</script>

<template>
  <Section icon="mingcute:chart-bar-line" :title="t('ai.summary.title')" :description="t('ai.summary.subtitle')">
    <div class="w-full flex flex-col gap-0.5">
      <div class="text-xs text-base-content/60">{{ t('ai.summary.total') }}</div>
      <div class="text-2xl font-bold tabular-nums">
        <span v-if="state.loading" class="inline-block w-24 h-6 skeleton align-middle" />
        <template v-else>{{ formatNumber(state.data.total) }}</template>
      </div>
    </div>
    <dl class="w-full flex flex-col gap-3">
      <div v-for="row in rows" :key="row.key" class="w-full flex flex-col gap-1.5">
        <div class="w-full flex items-center justify-between gap-3 text-sm">
          <dt class="text-base-content/70">{{ t(`ai.summary.${row.key}`) }}</dt>
          <dd class="font-medium tabular-nums">
            <span v-if="state.loading" class="inline-block w-12 h-2.5 skeleton" />
            <template v-else>{{ formatNumber(row.value) }}</template>
          </dd>
        </div>
        <div class="w-full h-1.5 bg-base-200 rounded-full overflow-hidden">
          <div class="h-full bg-base-content/80 rounded-full transition-[width] duration-500" :style="{ width: `${row.share}%` }" />
        </div>
      </div>
    </dl>
  </Section>
</template>
