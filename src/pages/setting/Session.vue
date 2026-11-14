<script setup>
import { onMounted, reactive, watch } from 'vue'
import { Icon } from '@iconify/vue'
import Page from '../../components/Page.vue'
import UiPagination from '../../components/UiPagination.vue'
import RowSkeleton from '../../components/RowSkeleton.vue'
import { t, formatRelative, formatDate } from '../../i18n'
import { getSessions, removeSession } from '../../api'
import { showToast } from '../../toast'
import { confirm } from '../../confirm'

const state = reactive({ loading: true, data: { docs: [], page: 1, totalPages: 1 } })

const browsers = [['Edg/', 'Edge'], ['OPR/', 'Opera'], ['SamsungBrowser', 'Samsung Internet'], ['Chrome/', 'Chrome'], ['Firefox/', 'Firefox'], ['Safari/', 'Safari']]
const systems = [['iPhone', 'iPhone'], ['iPad', 'iPad'], ['Android', 'Android'], ['Windows', 'Windows'], ['Mac OS', 'macOS'], ['Linux', 'Linux']]

function device(doc) {
  const agent = doc.userAgent || ''
  const browser = browsers.find(([needle]) => agent.includes(needle))?.[1] || ''
  const os = systems.find(([needle]) => agent.includes(needle))?.[1] || ''
  return browser && os ? t('session.on', { browser, os }) : browser || os || agent || t('session.unknown')
}
const deviceIcon = (doc) => (/iPhone|Android|Mobile/.test(doc.userAgent || '') ? 'mingcute:cellphone-line' : 'mingcute:computer-line')

async function load() {
  state.loading = true
  state.data.docs = []
  try {
    const { data } = await getSessions({ page: state.data.page, limit: 20 })
    Object.assign(state.data, data)
  } catch (error) {
    showToast(error.message, 'error')
  }
  state.loading = false
}

function remove(doc) {
  confirm({
    title: t('session.alert.title'),
    message: doc.isCurrent ? t('session.alert.message') : t('session.alert.other'),
    onConfirm: async () => {
      try {
        await removeSession(doc._id)
        showToast(t('session.toast'), 'success')
        load()
      } catch (error) {
        showToast(error.message, 'error')
      }
    },
  })
}

onMounted(load)
watch(() => state.data.page, load)
</script>

<template>
  <Page :title="t('session.title')" :description="t('setting.hint.session')">
    <div class="w-full bg-base-100 rounded-md flex flex-col overflow-hidden">
      <div class="px-5 py-3 flex items-center gap-2 text-xs text-base-content/60">
        <Icon icon="mingcute:time-line" class="shrink-0" />
        {{ t('session.ttl') }}
      </div>

      <div v-for="doc in state.data.docs" :key="doc._id" class="w-full flex items-center gap-3 px-5 py-3.5 border-t border-base-200">
        <span class="shrink-0 size-10 rounded-bubble [--bubble-r:0.625rem] bg-base-200 flex justify-center items-center">
          <Icon :icon="deviceIcon(doc)" class="text-lg" />
        </span>
        <div class="flex-1 min-w-0 flex flex-col gap-0.5">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-sm font-medium line-clamp-1 break-all" :title="doc.userAgent">{{ device(doc) }}</span>
            <span v-if="doc.isCurrent" class="px-1.5 py-px text-[11px] font-medium bg-primary text-primary-content rounded-bubble [--bubble-r:0.35rem]">
              {{ t('session.current') }}
            </span>
          </div>
          <div class="text-xs text-base-content/60 line-clamp-2">
            {{ doc.operator?._id ? `${t('session.section.operator')} · ${doc.operator.name}` : t('session.section.mainAccount') }} ·
            <span :title="formatDate(doc.updatedAt)">{{ t('session.active', { time: formatRelative(doc.updatedAt) }) }}</span>
          </div>
        </div>
        <button class="btn btn-sm max-sm:btn-square shrink-0 text-error" :title="t('session.signOut')" @click="remove(doc)">
          <Icon icon="mingcute:exit-line" />
          <span class="sm:inline hidden">{{ t('session.signOut') }}</span>
        </button>
      </div>

      <template v-if="state.loading"><RowSkeleton v-for="n in 6" :key="n" /></template>

      <div v-if="!state.loading && !state.data.docs.length" class="w-full flex flex-col justify-center items-center gap-2 py-16 border-t border-base-200">
        <Icon icon="mingcute:sandglass-2-line" class="text-2xl" />
        <div class="text-center text-sm font-medium">{{ t('session.empty') }}</div>
      </div>

      <div v-if="state.data.totalPages > 1" class="w-full flex justify-end p-4 border-t border-base-200">
        <UiPagination v-model="state.data.page" :total="state.data.totalPages" />
      </div>
    </div>
  </Page>
</template>
