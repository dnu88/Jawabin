<script setup>
import { onMounted, reactive, watch } from 'vue'
import { Icon } from '@iconify/vue'
import Page from '../../components/Page.vue'
import UiPagination from '../../components/UiPagination.vue'
import { t, formatRelative, formatDate } from '../../i18n'
import { getConnectedApps, removeConnectedApp } from '../../api'
import { showToast } from '../../toast'
import { confirm } from '../../confirm'
import { scopeIcon } from '../../scopes'

const state = reactive({ loading: true, data: { docs: [], page: 1, totalPages: 1 } })

function scopes(doc) {
  return (doc.scopes || []).map((value) => {
    const [name, mode] = value.split(':')
    return { value, icon: scopeIcon(value), label: t(`connectedApp.section.${name}`), isWrite: mode == 'write' }
  })
}
function host(doc) {
  try {
    return new URL(doc.app?.website).host
  } catch {
    return ''
  }
}

async function load() {
  state.loading = true
  state.data.docs = []
  try {
    const { data } = await getConnectedApps({ page: state.data.page, limit: 20 })
    Object.assign(state.data, data)
  } catch (error) {
    showToast(error.message, 'error')
  }
  state.loading = false
}

function remove(doc) {
  confirm({
    title: t('connectedApp.alert.title'),
    message: t('connectedApp.alert.message', { name: doc.app?.name || '' }),
    onConfirm: async () => {
      try {
        await removeConnectedApp(doc._id)
        showToast(t('connectedApp.toast'), 'success')
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
  <Page :title="t('connectedApp.title')" :description="t('setting.hint.connected_app')">
    <div class="w-full bg-base-100 rounded-md flex flex-col overflow-hidden">
      <div class="px-5 py-3 flex items-center gap-2 text-xs text-base-content/60">
        <Icon icon="mingcute:time-line" class="shrink-0" />
        {{ t('connectedApp.ttl') }}
      </div>

      <div v-for="doc in state.data.docs" :key="doc._id" class="w-full flex items-start gap-3 px-5 py-3.5 border-t border-base-200">
        <span class="shrink-0 size-10 rounded-bubble [--bubble-r:0.625rem] bg-base-200 overflow-hidden flex justify-center items-center font-semibold uppercase">
          {{ doc.app?.name?.[0] }}
        </span>
        <div class="flex-1 min-w-0 flex flex-col gap-1.5">
          <div class="flex flex-col gap-0.5">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-sm font-medium line-clamp-1 break-all">{{ doc.app?.name }}</span>
              <span v-if="doc.app?.isVerified" class="flex items-center gap-1 px-1.5 py-px text-[11px] font-medium bg-success/10 text-success rounded-bubble [--bubble-r:0.35rem]">
                <Icon icon="mingcute:certificate-line" />
                {{ t('connectedApp.verified') }}
              </span>
              <span v-else class="flex items-center gap-1 px-1.5 py-px text-[11px] font-medium bg-warning/15 rounded-bubble [--bubble-r:0.35rem]">
                <Icon icon="mingcute:warning-line" />
                {{ t('connectedApp.unverified') }}
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-x-1.5 text-xs text-base-content/60">
              <span>{{ doc.operator?._id ? `${t('connectedApp.operator')} · ${doc.operator.name}` : t('connectedApp.mainAccount') }}</span>
              <span>·</span>
              <span :title="formatDate(doc.lastUsedAt)">{{ t('connectedApp.active', { time: formatRelative(doc.lastUsedAt) }) }}</span>
              <template v-if="host(doc)">
                <span>·</span>
                <a :href="doc.app.website" target="_blank" rel="noopener noreferrer" class="hover:underline">{{ host(doc) }}</a>
              </template>
            </div>
          </div>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="scope in scopes(doc)"
              :key="scope.value"
              class="flex items-center gap-1 px-1.5 py-px text-[11px] font-medium bg-base-200 rounded-bubble [--bubble-r:0.35rem]"
              :title="scope.value"
            >
              <Icon :icon="scope.icon" />
              {{ scope.label }}
              <Icon v-if="scope.isWrite" icon="mingcute:edit-2-line" class="text-base-content/60" />
            </span>
          </div>
        </div>
        <button class="btn btn-sm max-sm:btn-square shrink-0 text-error" :title="t('connectedApp.disconnect')" @click="remove(doc)">
          <Icon icon="mingcute:unlink-2-line" />
          <span class="sm:inline hidden">{{ t('connectedApp.disconnect') }}</span>
        </button>
      </div>

      <div v-if="state.loading" class="w-full flex justify-center py-12 border-t border-base-200">
        <span class="loading loading-sm" />
      </div>

      <div v-if="!state.loading && !state.data.docs.length" class="w-full flex flex-col justify-center items-center gap-2 px-5 py-16 border-t border-base-200 text-center">
        <Icon icon="mingcute:plugin-2-line" class="text-2xl" />
        <div class="text-sm font-medium">{{ t('connectedApp.empty.title') }}</div>
        <p class="max-w-sm text-xs text-base-content/60">{{ t('connectedApp.empty.message') }}</p>
      </div>

      <div v-if="state.data.totalPages > 1" class="w-full flex justify-end p-4 border-t border-base-200">
        <UiPagination v-model="state.data.page" :total="state.data.totalPages" />
      </div>
    </div>
  </Page>
</template>
