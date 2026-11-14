<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import Page from '../../components/Page.vue'
import UiPagination from '../../components/UiPagination.vue'
import UiModal from '../../components/UiModal.vue'
import RowSkeleton from '../../components/RowSkeleton.vue'
import { t, te, formatDate, formatTime, formatDayLong } from '../../i18n'
import { getActivities, getOperators } from '../../api'
import { showToast } from '../../toast'

const moduleIcons = {
  menu: 'mingcute:layout-grid-line', auth: 'mingcute:open-door-line', account: 'mingcute:classify-2-line',
  comment: 'mingcute:chat-1-line', chat: 'mingcute:chat-2-line', contact: 'mingcute:contacts-3-line',
  content: 'mingcute:pic-2-line', schedule: 'mingcute:calendar-time-add-line', automation: 'mingcute:flash-line',
  comment_sync: 'mingcute:refresh-2-line', template: 'mingcute:layout-3-line', report: 'mingcute:list-check-3-line',
  storage: 'mingcute:folder-2-line', pinterest_board: 'mingcute:pinterest-line', operator: 'mingcute:user-security-line',
  ai_assistant: 'mingcute:ai-line', session: 'mingcute:computer-line', setting: 'mingcute:settings-3-line',
  oauth: 'mingcute:plugin-2-line', webhook: 'mingcute:webhook-line', billing: 'mingcute:bank-card-line',
}
const sourceIcons = { api: 'mingcute:web-line', oauth: 'mingcute:plugin-2-line', ai_assistant: 'mingcute:ai-line' }
const hiddenDetails = ['count', 'platform', 'method']

const empty = () => ({ module: '', source: '', status: '', period: '' })
const state = reactive({ loading: true, open: {}, filter: { operatorId: '', ...empty() }, data: { docs: [], page: 1, totalPages: 1 } })
const draft = reactive(empty())
const showFilter = ref(false)
const operators = ref([])

const hasFilter = computed(() => !!(state.filter.module || state.filter.source || state.filter.status || state.filter.period))
const filterGroups = computed(() => [
  { key: 'period', options: ['', '1', '7', '30'].map((value) => ({ value, label: t(`activity.period.${value || 'all'}`) })) },
  { key: 'module', options: [{ value: '', label: t('activity.filter.all') }, ...Object.keys(moduleIcons).map((value) => ({ value, label: t(`activity.module.${value}`) }))] },
  { key: 'source', options: [{ value: '', label: t('activity.filter.all') }, ...['web', 'api', 'oauth', 'ai_assistant'].map((value) => ({ value, label: t(`activity.source.${value}`) }))] },
  { key: 'status', options: [{ value: '', label: t('activity.filter.all') }, ...['success', 'failed'].map((value) => ({ value, label: t(`activity.status.${value}`) }))] },
])

const dayKey = (date) => new Date(date).toDateString()
function dayLabel(date) {
  if (dayKey(date) == dayKey(Date.now())) return t('activity.day.today')
  if (dayKey(date) == dayKey(Date.now() - 86400000)) return t('activity.day.yesterday')
  return formatDayLong(date)
}
const groups = computed(() => {
  const list = []
  for (const doc of state.data.docs) {
    let group = list.find((item) => item.key == dayKey(doc.createdAt))
    if (!group) list.push((group = { key: dayKey(doc.createdAt), label: dayLabel(doc.createdAt), docs: [] }))
    group.docs.push(doc)
  }
  return list
})

function icon(doc) {
  if (doc.module == 'auth' && doc.action == 'logout') return 'mingcute:exit-door-line'
  return moduleIcons[doc.module] || 'mingcute:document-line'
}
function title(doc) {
  const key = `activity.event.${doc.module}_${doc.action}`
  if (!te(key)) return `${doc.module} ${doc.action}`.replace(/_/g, ' ')
  const count = Number(doc.detail?.count || 0)
  const method = doc.detail?.method == 'google' ? 'Google' : t('activity.method.password')
  return t(key, { count, platform: doc.detail?.platform || '', method }, count || 1)
}
function details(doc) {
  return Object.entries(doc.detail || {})
    .filter(([key]) => !hiddenDetails.includes(key))
    .map(([key, value]) => ({ key, label: te(`activity.detail.${key}`) ? t(`activity.detail.${key}`) : key, value: String(value) }))
}
function device(agent = '') {
  const browser = [['Edg/', 'Edge'], ['Chrome/', 'Chrome'], ['Firefox/', 'Firefox'], ['Safari/', 'Safari']].find(([n]) => agent.includes(n))?.[1]
  const os = [['iPhone', 'iPhone'], ['Android', 'Android'], ['Windows', 'Windows'], ['Mac OS', 'macOS'], ['Linux', 'Linux']].find(([n]) => agent.includes(n))?.[1]
  return [browser, os].filter(Boolean).join(' · ') || agent
}
function fromDate(period) {
  if (!period) return ''
  if (period == '1') return new Date(Date.now() - 86400000).toISOString()
  const start = new Date(Date.now() - (Number(period) - 1) * 86400000)
  start.setHours(0, 0, 0, 0)
  return start.toISOString()
}

async function load() {
  state.loading = true
  state.data.docs = []
  try {
    const { data } = await getActivities({ page: state.data.page, limit: 30, ...state.filter, fromDate: fromDate(state.filter.period) })
    Object.assign(state.data, data)
  } catch (error) {
    showToast(error.message, 'error')
  }
  state.loading = false
}
function reload() {
  if (state.data.page != 1) state.data.page = 1
  else load()
}
function openFilter() {
  Object.assign(draft, { module: state.filter.module, source: state.filter.source, status: state.filter.status, period: state.filter.period })
  showFilter.value = true
}
function applyFilter(values) {
  Object.assign(state.filter, values)
  showFilter.value = false
  reload()
}

onMounted(async () => {
  load()
  try {
    operators.value = (await getOperators()).data.docs
  } catch {}
})
watch(() => state.data.page, load)
watch(() => state.filter.operatorId, reload)
</script>

<template>
  <Page :title="t('activity.title')" :description="t('setting.hint.activity')">
    <template #action>
      <button class="btn btn-sm" :class="{ 'btn-primary': hasFilter }" @click="openFilter">
        <Icon :icon="hasFilter ? 'mingcute:filter-fill' : 'mingcute:filter-line'" />
        {{ t('activity.filter.button') }}
      </button>
    </template>

    <div class="w-full bg-base-100 rounded-md flex flex-col overflow-hidden">
      <div class="px-5 py-3 flex sm:flex-row flex-col sm:items-center gap-3">
        <div class="flex-1 min-w-0 flex items-center gap-2 text-xs text-base-content/60">
          <Icon icon="mingcute:time-line" class="shrink-0" />
          {{ t('activity.ttl') }}
        </div>
        <select v-model="state.filter.operatorId" class="select select-sm sm:w-56 w-full" :aria-label="t('activity.filter.account')">
          <option value="">{{ t('activity.account.all') }}</option>
          <option value="owner">{{ t('activity.account.owner') }}</option>
          <option v-for="operator in operators" :key="operator._id" :value="operator._id">{{ operator.name }}</option>
        </select>
      </div>

      <template v-for="group in groups" :key="group.key">
        <div class="px-5 py-2 border-t border-base-200 bg-base-200/40 text-xs font-medium text-base-content/60">{{ group.label }}</div>
        <div v-for="doc in group.docs" :key="doc._id" class="w-full flex flex-col border-t border-base-200">
          <button
            type="button"
            class="w-full flex items-start gap-3 px-5 py-3.5 text-left cursor-pointer hover:bg-base-200/40 transition-colors"
            :aria-expanded="!!state.open[doc._id]"
            @click="state.open[doc._id] = !state.open[doc._id]"
          >
            <span
              class="shrink-0 size-9 rounded-bubble [--bubble-r:0.625rem] flex justify-center items-center"
              :class="doc.status == 'failed' ? 'bg-error/10 text-error' : 'bg-base-200'"
            >
              <Icon :icon="icon(doc)" class="text-lg" />
            </span>
            <div class="flex-1 min-w-0 flex flex-col gap-1">
              <div class="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                <span class="text-sm font-medium">{{ title(doc) }}</span>
                <span v-if="doc.target?.label" class="min-w-0 max-w-full text-sm text-base-content/70 line-clamp-1 break-all" :title="doc.target.label">
                  “{{ doc.target.label }}”
                </span>
              </div>
              <div class="flex flex-wrap items-center gap-1.5 text-xs text-base-content/60">
                <template v-if="state.filter.operatorId == ''">
                  <span class="font-medium text-base-content/80">{{ doc.actor?.name }}</span>
                  <span>·</span>
                  <span>{{ t(`activity.role.${doc.actor?.type || 'owner'}`) }}</span>
                  <span>·</span>
                </template>
                <span :title="formatDate(doc.createdAt)">{{ formatTime(doc.createdAt) }}</span>
                <span v-if="doc.source != 'web'" class="flex items-center gap-1 px-1.5 py-px text-[11px] font-medium bg-base-200 rounded-bubble [--bubble-r:0.35rem]">
                  <Icon :icon="sourceIcons[doc.source] || 'mingcute:web-line'" />
                  {{ t(`activity.source.${doc.source}`) }}
                </span>
                <span v-if="doc.status == 'failed'" class="flex items-center gap-1 px-1.5 py-px text-[11px] font-medium bg-error/10 text-error rounded-bubble [--bubble-r:0.35rem]">
                  <Icon icon="mingcute:warning-line" />
                  {{ t('activity.status.failed') }}
                </span>
              </div>
              <div v-if="details(doc).length" class="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
                <span v-for="item in details(doc)" :key="item.key" class="min-w-0 break-all">
                  <span class="text-base-content/50">{{ item.label }}:</span>
                  {{ item.value }}
                </span>
              </div>
            </div>
            <Icon icon="mingcute:down-line" class="shrink-0 mt-2 text-base-content/40 transition-transform" :class="{ 'rotate-180': state.open[doc._id] }" />
          </button>
          <div v-if="state.open[doc._id]" class="w-full grid sm:grid-cols-2 grid-cols-1 gap-x-6 gap-y-2 px-5 pb-4 pl-17 text-xs">
            <div v-if="doc.status == 'failed' && doc.errorMessage" class="sm:col-span-2 flex flex-col gap-0.5">
              <span class="text-base-content/50">{{ t('activity.info.error') }}</span>
              <span class="text-error break-all">{{ doc.errorMessage }}</span>
            </div>
            <div v-if="doc.actor?.email" class="flex flex-col gap-0.5">
              <span class="text-base-content/50">{{ t('activity.info.actor') }}</span>
              <span class="break-all">{{ doc.actor.name }} · {{ doc.actor.email }}</span>
            </div>
            <div v-if="doc.userAgent" class="flex flex-col gap-0.5">
              <span class="text-base-content/50">{{ t('activity.info.device') }}</span>
              <span class="break-all" :title="doc.userAgent">{{ device(doc.userAgent) }}</span>
            </div>
            <div v-if="doc.ip" class="flex flex-col gap-0.5">
              <span class="text-base-content/50">{{ t('activity.info.ip') }}</span>
              <span class="break-all">{{ doc.ip }}</span>
            </div>
            <div v-if="doc.path" class="flex flex-col gap-0.5">
              <span class="text-base-content/50">{{ t('activity.info.endpoint') }}</span>
              <span class="font-mono break-all">{{ doc.method }} {{ doc.path }}</span>
            </div>
            <div class="flex flex-col gap-0.5">
              <span class="text-base-content/50">{{ t('activity.info.time') }}</span>
              <span>{{ formatDate(doc.createdAt) }}</span>
            </div>
          </div>
        </div>
      </template>

      <template v-if="state.loading"><RowSkeleton v-for="n in 6" :key="n" /></template>

      <div v-if="!state.loading && !state.data.docs.length" class="w-full flex flex-col justify-center items-center gap-2 py-16 border-t border-base-200">
        <Icon icon="mingcute:list-search-line" class="text-2xl" />
        <div class="text-center text-sm font-medium">{{ t('activity.empty') }}</div>
      </div>

      <div v-if="state.data.totalPages > 1" class="w-full flex justify-end p-4 border-t border-base-200">
        <UiPagination v-model="state.data.page" :total="state.data.totalPages" />
      </div>
    </div>
  </Page>

  <UiModal v-model="showFilter" :title="t('activity.filter.title')">
    <div class="w-full flex flex-col gap-5">
      <div v-for="group in filterGroups" :key="group.key" class="flex flex-col gap-2">
        <div class="text-xs text-base-content/70">{{ t(`activity.filter.${group.key}`) }}</div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="option in group.options"
            :key="option.value"
            class="btn btn-xs"
            :class="{ 'btn-primary': draft[group.key] == option.value }"
            :aria-pressed="draft[group.key] == option.value"
            @click="draft[group.key] = option.value"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
      <div class="w-full flex items-center gap-3">
        <button class="btn flex-1" @click="applyFilter(empty())">Reset</button>
        <button class="btn btn-primary flex-1" @click="applyFilter({ ...draft })">{{ t('activity.filter.button') }}</button>
      </div>
    </div>
  </UiModal>
</template>
