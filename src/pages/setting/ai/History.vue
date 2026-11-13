<script setup>
import { onMounted, reactive, watch } from 'vue'
import { Icon } from '@iconify/vue'
import UiPagination from '../../../components/UiPagination.vue'
import HistoryItem from './HistoryItem.vue'
import { t } from '../../../i18n'
import { getUsage } from '../../../api'
import { showToast } from '../../../toast'

const state = reactive({ loading: true, data: { docs: [], page: 1, totalPages: 1 } })

async function load() {
  state.loading = true
  state.data.docs = []
  try {
    const { data } = await getUsage(state.data.page, 20)
    state.data.docs = data.docs
    state.data.page = data.page
    state.data.totalPages = data.totalPages
  } catch (error) {
    showToast(error.message, 'error')
  }
  state.loading = false
}

onMounted(load)
watch(() => state.data.page, load)
</script>

<template>
  <div class="w-full bg-base-100 rounded-md flex flex-col overflow-hidden">
    <div class="px-5 pt-5 pb-3 flex flex-col gap-0.5">
      <h2 class="text-sm font-semibold">{{ t('ai.history.title') }}</h2>
      <p class="text-xs text-base-content/60">{{ t('ai.history.subtitle') }}</p>
    </div>

    <HistoryItem v-for="doc in state.data.docs" :key="doc._id" :doc="doc" />

    <template v-if="state.loading">
      <div v-for="n in 8" :key="n" class="w-full flex items-center gap-3 px-5 py-3.5 border-t border-base-200">
        <div class="shrink-0 size-9 rounded-md skeleton" />
        <div class="flex-1 flex flex-col gap-2">
          <div class="w-28 h-2.5 skeleton" />
          <div class="w-56 max-w-full h-2 skeleton" />
        </div>
        <div class="shrink-0 flex flex-col items-end gap-2">
          <div class="w-16 h-2.5 skeleton" />
          <div class="w-10 h-2 skeleton" />
        </div>
      </div>
    </template>

    <div
      v-if="!state.loading && !state.data.docs.length"
      class="w-full flex flex-col justify-center items-center gap-2 py-16 border-t border-base-200"
    >
      <Icon icon="mingcute:ai-line" class="text-2xl" />
      <div class="text-center text-sm font-medium">{{ t('ai.history.empty') }}</div>
    </div>

    <div v-if="state.data.totalPages > 1" class="w-full flex justify-end p-4 border-t border-base-200">
      <UiPagination v-model="state.data.page" :total="state.data.totalPages" />
    </div>
  </div>
</template>
