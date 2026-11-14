<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import Page from '../../components/Page.vue'
import UiPagination from '../../components/UiPagination.vue'
import UiModal from '../../components/UiModal.vue'
import { t, formatDate, formatTime, formatNumber, formatRupiah, capitalize } from '../../i18n'
import { getTransactions } from '../../api'
import { showToast } from '../../toast'

const icons = { plan: 'mingcute:vip-1-line', token: 'mingcute:ai-line', addon: 'mingcute:add-circle-line' }
const state = reactive({ loading: true, selected: null, filter: { search: '' }, data: { docs: [], page: 1, totalPages: 1 } })
const showDetail = ref(false)
const searched = ref('')

function describe(doc) {
  const name = doc.type == 'plan' ? t('transaction.name.plan', { plan: capitalize(doc.plan) }) : t(`transaction.name.${doc.type}`)
  const unit = doc.type == 'addon' ? doc.plan : doc.type
  return { name, quantity: t(`transaction.quantity.${unit}`, { n: formatNumber(doc.month) }, doc.month) }
}
// Unpaid invoices expire one hour after they are created.
const payBefore = (doc) => formatTime(new Date(new Date(doc.createdAt).getTime() + 3600 * 1000))
const statusClass = (status) => ({
  'bg-base-200': status == 'paid',
  'bg-warning/15': status == 'unpaid',
  'border border-dashed border-base-300 text-base-content/60': status == 'canceled',
})

const detailRows = computed(() => {
  const doc = state.selected
  if (!doc) return []
  const info = describe(doc)
  return [
    { key: 'id', value: doc.identifierId },
    { key: 'item', value: info.name },
    { key: 'quantity', value: info.quantity },
    { key: 'method', value: t('transaction.method.duitku') },
    doc.coupon?.code && { key: 'coupon', value: `${doc.coupon.code} (−${doc.coupon.value}%)` },
    { key: 'created', value: formatDate(doc.createdAt) },
  ].filter(Boolean)
})

async function load() {
  state.loading = true
  state.data.docs = []
  try {
    const { data } = await getTransactions({ page: state.data.page, limit: 20, search: state.filter.search })
    Object.assign(state.data, data)
    searched.value = state.filter.search
  } catch (error) {
    showToast(error.message, 'error')
  }
  state.loading = false
}

function search() {
  state.data.page = 1
  load()
}
function openDetail(doc) {
  state.selected = doc
  showDetail.value = true
}

onMounted(load)
watch(() => state.data.page, load)
</script>

<template>
  <Page :title="t('transaction.title')" :description="t('setting.hint.transaction')">
    <div class="w-full bg-base-100 rounded-md flex sm:flex-row flex-col sm:items-center gap-3 px-5 py-3">
      <label class="sm:w-64 w-full input">
        <Icon icon="mingcute:search-line" class="text-base-content/50" />
        <input v-model="state.filter.search" type="search" class="w-full" :placeholder="t('transaction.search')" @keyup.enter="search" @search="search" />
      </label>
      <div class="flex-1 flex items-start gap-1.5 text-xs text-base-content/60 sm:justify-end">
        <Icon icon="mingcute:time-line" class="shrink-0 mt-px" />
        {{ t('transaction.expire') }}
      </div>
    </div>

    <div v-if="state.loading || state.data.docs.length" class="w-full grid sm:grid-cols-2 grid-cols-1 gap-3">
      <article v-for="doc in state.data.docs" :key="doc.identifierId" class="w-full bg-base-100 rounded-md p-4 flex flex-col gap-4">
        <button type="button" class="w-full flex items-start gap-3 text-left cursor-pointer group" @click="openDetail(doc)">
          <span class="shrink-0 size-9 rounded-bubble [--bubble-r:0.5rem] bg-base-200 flex justify-center items-center">
            <Icon :icon="icons[doc.type] || 'mingcute:bank-card-line'" />
          </span>
          <span class="flex-1 min-w-0 flex flex-col gap-0.5">
            <span class="text-sm font-medium line-clamp-1 group-hover:underline underline-offset-2">
              {{ describe(doc).name }}
              <span class="font-normal text-base-content/60">· {{ describe(doc).quantity }}</span>
            </span>
            <span class="text-xs text-base-content/60 tabular-nums">{{ doc.identifierId }}</span>
          </span>
          <span class="shrink-0 flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded-bubble [--bubble-r:0.4rem]" :class="statusClass(doc.status)">
            <span v-if="doc.status == 'unpaid'" class="size-1.5 rounded-full bg-warning" aria-hidden="true" />
            {{ t(`transaction.status.${doc.status}`) }}
          </span>
        </button>
        <div class="w-full flex items-end justify-between gap-3 pt-3 border-t border-base-200">
          <div class="min-w-0 flex flex-col gap-0.5">
            <span class="text-lg font-bold tabular-nums" :class="{ 'line-through text-base-content/40': doc.status == 'canceled' }">
              {{ formatRupiah(doc.amount) }}
            </span>
            <span class="text-xs text-base-content/60 tabular-nums">
              {{ doc.status == 'unpaid' ? t('transaction.payBefore', { time: payBefore(doc) }) : formatDate(doc.createdAt) }}
            </span>
          </div>
          <div class="shrink-0 flex items-center gap-1.5">
            <a v-if="doc.status == 'unpaid'" :href="doc.url" class="btn btn-sm btn-primary">{{ t('transaction.button.pay') }}</a>
            <button v-else-if="doc.status == 'paid'" class="btn btn-sm" @click="openDetail(doc)">
              <Icon icon="mingcute:file-line" />
              {{ t('transaction.button.invoice') }}
            </button>
            <button v-else class="btn btn-sm btn-ghost" :aria-label="t('transaction.detail.title')" @click="openDetail(doc)">
              <Icon icon="mingcute:right-line" />
            </button>
          </div>
        </div>
      </article>

      <template v-if="state.loading">
        <div v-for="n in 6" :key="n" class="w-full bg-base-100 rounded-md p-4 flex flex-col gap-4">
          <div class="w-full flex items-start gap-3">
            <div class="shrink-0 size-9 rounded-md skeleton" />
            <div class="flex-1 flex flex-col gap-2 pt-1">
              <div class="w-36 h-2.5 skeleton" />
              <div class="w-24 h-2 skeleton" />
            </div>
            <div class="shrink-0 w-12 h-4 skeleton" />
          </div>
          <div class="w-full flex items-end justify-between gap-3 pt-3 border-t border-base-200">
            <div class="flex flex-col gap-2">
              <div class="w-24 h-4 skeleton" />
              <div class="w-28 h-2 skeleton" />
            </div>
            <div class="w-20 h-7 skeleton" />
          </div>
        </div>
      </template>
    </div>

    <div v-else class="w-full bg-base-100 rounded-md flex flex-col justify-center items-center gap-1 py-16 px-5 text-center">
      <Icon icon="mingcute:bank-card-line" class="text-2xl mb-1" />
      <div v-if="searched" class="text-sm font-medium">{{ t('transaction.noResult', { search: searched }) }}</div>
      <template v-else>
        <div class="text-sm font-medium">{{ t('transaction.empty') }}</div>
        <div class="text-xs text-base-content/60">{{ t('transaction.emptyHint') }}</div>
      </template>
    </div>

    <div v-if="state.data.totalPages > 1" class="w-full flex justify-end">
      <UiPagination v-model="state.data.page" :total="state.data.totalPages" />
    </div>
  </Page>

  <UiModal v-model="showDetail" :title="t('transaction.detail.title')">
    <div v-if="state.selected" class="w-full flex flex-col gap-5">
      <div class="w-full flex flex-col items-center gap-1 py-2">
        <span class="text-3xl font-bold tabular-nums" :class="{ 'line-through text-base-content/40': state.selected.status == 'canceled' }">
          {{ formatRupiah(state.selected.amount) }}
        </span>
        <span class="flex items-center gap-1.5 text-sm text-base-content/70">
          <span v-if="state.selected.status == 'unpaid'" class="size-1.5 rounded-full bg-warning" aria-hidden="true" />
          {{ t(`transaction.status.${state.selected.status}`) }}
          <template v-if="state.selected.status == 'unpaid'"> · {{ t('transaction.payBefore', { time: payBefore(state.selected) }) }}</template>
        </span>
      </div>
      <dl class="w-full flex flex-col bg-base-200/60 rounded-bubble [--bubble-r:0.75rem] px-4">
        <div v-for="row in detailRows" :key="row.key" class="w-full flex items-center justify-between gap-3 py-2.5 border-b border-base-300/60 last:border-b-0 text-sm">
          <dt class="shrink-0 text-base-content/70">{{ t(`transaction.detail.${row.key}`) }}</dt>
          <dd class="min-w-0 font-medium tabular-nums text-right break-all">{{ row.value }}</dd>
        </div>
      </dl>
      <a v-if="state.selected.status == 'unpaid'" :href="state.selected.url" class="btn btn-primary btn-block">{{ t('transaction.button.pay') }}</a>
    </div>
  </UiModal>
</template>
