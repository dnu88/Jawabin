<script setup>
import { onMounted, reactive, watch } from 'vue'
import { Icon } from '@iconify/vue'
import Page from '../components/Page.vue'
import UiPagination from '../components/UiPagination.vue'
import RowSkeleton from '../components/RowSkeleton.vue'
import { t, formatRelative, formatDate } from '../i18n'
import { getComments, replyComment, setCommentStatus } from '../api'
import { showToast } from '../toast'

const filters = ['', 'pending', 'resolved', 'ignored']
const state = reactive({ loading: true, status: '', drafts: {}, open: '', busy: '', data: { docs: [], page: 1, totalPages: 1 } })

async function load() {
  state.loading = true
  state.data.docs = []
  try {
    const { data } = await getComments({ page: state.data.page, limit: 20, status: state.status })
    Object.assign(state.data, data)
  } catch (error) {
    showToast(error.message, 'error')
  }
  state.loading = false
}

function replace(doc, next) {
  Object.assign(doc, next)
  // A comment that no longer fits the active filter leaves the list.
  if (state.status && doc.status != state.status) state.data.docs = state.data.docs.filter((item) => item._id != doc._id)
}

async function send(doc) {
  const text = (state.drafts[doc._id] || '').trim()
  if (!text || state.busy) return
  state.busy = doc._id
  try {
    replace(doc, await replyComment(doc._id, text))
    state.drafts[doc._id] = ''
    state.open = ''
    showToast(t('comment.toast'), 'success')
  } catch (error) {
    showToast(error.message, 'error')
  }
  state.busy = ''
}

async function setStatus(doc, status) {
  if (state.busy) return
  state.busy = doc._id
  try {
    replace(doc, await setCommentStatus(doc._id, status))
  } catch (error) {
    showToast(error.message, 'error')
  }
  state.busy = ''
}

function pick(status) {
  state.status = status
  if (state.data.page != 1) state.data.page = 1
  else load()
}

onMounted(load)
watch(() => state.data.page, load)
</script>

<template>
  <Page :title="t('comment.title')" :description="t('comment.hint')" back="">
    <div class="w-full bg-base-100 rounded-md flex flex-col overflow-hidden">
      <div class="px-5 py-3 flex flex-wrap items-center gap-1.5" role="tablist">
        <button
          v-for="status in filters"
          :key="status"
          role="tab"
          :aria-selected="state.status == status"
          class="btn btn-xs"
          :class="{ 'btn-primary': state.status == status }"
          @click="pick(status)"
        >
          {{ t(`comment.filter.${status || 'all'}`) }}
        </button>
      </div>

      <div v-for="doc in state.data.docs" :key="doc._id" class="w-full flex flex-col gap-2.5 px-5 py-3.5 border-t border-base-200">
        <div class="w-full flex items-start gap-3">
          <span class="shrink-0 size-9 rounded-full bg-base-200 flex justify-center items-center text-sm font-semibold uppercase">{{ doc.from?.[0] || '?' }}</span>
          <div class="flex-1 min-w-0 flex flex-col gap-0.5">
            <div class="flex flex-wrap items-center gap-x-1.5 text-xs text-base-content/60">
              <span class="text-sm font-medium text-base-content break-all">@{{ doc.from }}</span>
              <span>·</span>
              <span :title="formatDate(doc.createdAt)">{{ formatRelative(doc.createdAt) }}</span>
              <template v-if="doc.account">
                <span>·</span>
                <span class="flex items-center gap-1"><Icon icon="mingcute:instagram-line" />@{{ doc.account.username }}</span>
              </template>
            </div>
            <p class="text-sm whitespace-pre-wrap wrap-anywhere">{{ doc.text }}</p>
          </div>
          <span
            class="shrink-0 px-2 py-0.5 text-[11px] font-medium rounded-bubble [--bubble-r:0.4rem]"
            :class="{ 'bg-warning/15': doc.status == 'pending', 'bg-base-200': doc.status == 'resolved', 'border border-dashed border-base-300 text-base-content/60': doc.status == 'ignored' }"
          >
            {{ t(`comment.filter.${doc.status}`) }}
          </span>
        </div>

        <div v-if="doc.replyText" class="sm:ml-12 flex flex-col gap-0.5 px-3 py-2 bg-base-200/60 rounded-bubble [--bubble-r:0.625rem]">
          <span class="text-[11px] text-base-content/60">{{ t(`comment.by.${doc.repliedBy || 'manual'}`) }}</span>
          <p class="text-sm whitespace-pre-wrap wrap-anywhere">{{ doc.replyText }}</p>
        </div>
        <p v-if="doc.error" class="sm:ml-12 flex items-start gap-1.5 text-xs text-error">
          <Icon icon="mingcute:warning-line" class="shrink-0 mt-px" />
          {{ t('comment.failed', { message: doc.error }) }}
        </p>

        <form v-if="state.open == doc._id" class="sm:ml-12 flex items-end gap-2" @submit.prevent="send(doc)">
          <textarea
            v-model="state.drafts[doc._id]"
            rows="2"
            class="flex-1 min-w-0 textarea"
            :placeholder="t('comment.placeholder')"
            :aria-label="t('comment.reply')"
            @keydown.enter.exact.prevent="send(doc)"
          />
          <button type="submit" class="btn btn-primary btn-sm" :disabled="state.busy == doc._id || !(state.drafts[doc._id] || '').trim()">
            <span v-if="state.busy == doc._id" class="loading loading-xs" />
            {{ t('comment.send') }}
          </button>
        </form>
        <div v-else class="sm:ml-12 flex items-center gap-1.5">
          <button class="btn btn-xs" @click="state.open = doc._id">
            <Icon icon="mingcute:share-forward-line" />
            {{ t('comment.reply') }}
          </button>
          <button v-if="doc.status == 'pending'" class="btn btn-xs btn-ghost" :disabled="state.busy == doc._id" @click="setStatus(doc, 'ignored')">{{ t('comment.ignore') }}</button>
          <button v-else-if="doc.status == 'ignored'" class="btn btn-xs btn-ghost" :disabled="state.busy == doc._id" @click="setStatus(doc, 'pending')">{{ t('comment.reopen') }}</button>
        </div>
      </div>

      <template v-if="state.loading"><RowSkeleton v-for="n in 6" :key="n" /></template>

      <div v-if="!state.loading && !state.data.docs.length" class="w-full flex flex-col justify-center items-center gap-2 py-16 border-t border-base-200">
        <Icon icon="mingcute:chat-1-line" class="text-2xl" />
        <div class="text-center text-sm font-medium">{{ t('comment.empty') }}</div>
      </div>

      <div v-if="state.data.totalPages > 1" class="w-full flex justify-end p-4 border-t border-base-200">
        <UiPagination v-model="state.data.page" :total="state.data.totalPages" />
      </div>
    </div>
  </Page>
</template>
