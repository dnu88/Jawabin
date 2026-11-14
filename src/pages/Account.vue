<script setup>
import { onMounted, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import Page from '../components/Page.vue'
import { t, formatRelative, formatDate } from '../i18n'
import { getAccounts, removeAccount, getInstagramAuthorizeUrl } from '../api'
import { showToast } from '../toast'
import { confirm } from '../confirm'

const route = useRoute()
const router = useRouter()
const state = reactive({ loading: true, connecting: false, docs: [] })

async function load() {
  state.loading = true
  try {
    state.docs = await getAccounts()
  } catch (error) {
    showToast(error.message, 'error')
  }
  state.loading = false
}

async function connect() {
  state.connecting = true
  try {
    window.location.href = await getInstagramAuthorizeUrl()
  } catch (error) {
    showToast(error.message, 'error')
    state.connecting = false
  }
}

function remove(doc) {
  confirm({
    title: t('account.alert.title'),
    message: t('account.alert.message', { name: doc.username }),
    onConfirm: async () => {
      try {
        await removeAccount(doc._id)
        showToast(t('account.toast.removed'), 'success')
        load()
      } catch (error) {
        showToast(error.message, 'error')
      }
    },
  })
}

onMounted(() => {
  // Instagram's OAuth redirect lands here with the result in the query string.
  if (route.query.connected) showToast(t('account.toast.connected', { name: route.query.connected }), 'success')
  if (route.query.error) showToast(String(route.query.error), 'error')
  if (route.query.connected || route.query.error) router.replace({ query: {} })
  load()
})
</script>

<template>
  <Page :title="t('account.title')" :description="t('account.hint')" back="">
    <template #action>
      <button class="btn btn-primary btn-sm" :disabled="state.connecting" @click="connect">
        <span v-if="state.connecting" class="loading loading-xs" />
        <Icon v-else icon="mingcute:instagram-line" />
        <span class="sm:inline hidden">{{ t('account.connect') }}</span>
      </button>
    </template>

    <div class="w-full bg-base-100 rounded-md flex flex-col overflow-hidden">
      <div class="px-5 py-3 flex items-center gap-2 text-xs text-base-content/60">
        <Icon icon="mingcute:information-line" class="shrink-0" />
        {{ t('account.note') }}
      </div>

      <div v-for="doc in state.docs" :key="doc._id" class="w-full flex items-center gap-3 px-5 py-3.5 border-t border-base-200">
        <span class="shrink-0 size-10 rounded-full bg-base-200 overflow-hidden flex justify-center items-center font-semibold uppercase">
          <img v-if="doc.picture" :src="doc.picture" alt="" referrerpolicy="no-referrer" class="size-full object-cover" />
          <template v-else>{{ doc.username?.[0] }}</template>
        </span>
        <div class="flex-1 min-w-0 flex flex-col gap-0.5">
          <div class="flex items-center gap-1.5 text-sm font-medium">
            <Icon icon="mingcute:instagram-line" class="shrink-0" />
            <span class="line-clamp-1 break-all">@{{ doc.username }}</span>
          </div>
          <div class="text-xs text-base-content/60 line-clamp-1">
            <template v-if="doc.name">{{ doc.name }} · </template>
            <span :title="formatDate(doc.createdAt)">{{ t('account.since', { time: formatRelative(doc.createdAt) }) }}</span>
          </div>
        </div>
        <button class="btn btn-sm max-sm:btn-square shrink-0 text-error" :title="t('account.remove')" @click="remove(doc)">
          <Icon icon="mingcute:unlink-2-line" />
          <span class="sm:inline hidden">{{ t('account.remove') }}</span>
        </button>
      </div>

      <div v-if="state.loading" class="w-full flex justify-center py-12 border-t border-base-200">
        <span class="loading loading-sm" />
      </div>

      <div v-if="!state.loading && !state.docs.length" class="w-full flex flex-col justify-center items-center gap-2 px-5 py-16 border-t border-base-200 text-center">
        <Icon icon="mingcute:classify-2-line" class="text-2xl" />
        <div class="text-sm font-medium">{{ t('account.empty.title') }}</div>
        <p class="max-w-sm text-xs text-base-content/60">{{ t('account.empty.message') }}</p>
      </div>
    </div>
  </Page>
</template>
