<script setup>
import { nextTick, onMounted, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import Page from '../components/Page.vue'
import RowSkeleton from '../components/RowSkeleton.vue'
import UiPagination from '../components/UiPagination.vue'
import { formatRelative, formatTime, t } from '../i18n'
import { getChat, getChats, sendChatMessage } from '../api'
import { showToast } from '../toast'

const state = reactive({
  loading: true,
  loadingThread: false,
  list: [],
  page: 1,
  totalPages: 1,
  selected: '',
  chat: null,
  messages: [],
  draft: '',
  sending: false,
})

const thread = ref(null)

async function loadList(page = 1) {
  state.loading = true
  try {
    const { data } = await getChats({ page, limit: 20 })
    state.list = data.docs
    state.page = data.page
    state.totalPages = data.totalPages
    if (!state.selected && state.list.length && window.matchMedia('(min-width: 1024px)').matches) open(state.list[0]._id)
  } catch (error) {
    showToast(error.message, 'error')
  }
  state.loading = false
}

async function scrollDown() {
  await nextTick()
  if (thread.value) thread.value.scrollTop = thread.value.scrollHeight
}

async function open(id) {
  state.selected = id
  state.loadingThread = true
  state.chat = null
  state.messages = []
  try {
    const data = await getChat(id)
    state.chat = data.chat
    state.messages = data.messages
    const row = state.list.find((item) => item._id == id)
    if (row) row.unread = 0
    await scrollDown()
  } catch (error) {
    showToast(error.message, 'error')
  }
  state.loadingThread = false
}

async function send() {
  const text = state.draft.trim()
  if (!text || state.sending || !state.chat?.canReply) return
  state.sending = true
  try {
    const message = await sendChatMessage(state.chat._id, text)
    state.messages.push(message)
    state.chat.lastMessageText = message.text
    state.chat.lastMessageAt = message.createdAt
    state.draft = ''
    const row = state.list.find((item) => item._id == state.chat._id)
    if (row) Object.assign(row, { lastMessageText: message.text, lastMessageAt: message.createdAt })
    await scrollDown()
  } catch (error) {
    showToast(error.message, 'error')
  }
  state.sending = false
}

onMounted(loadList)
watch(() => state.page, (page) => loadList(page))
</script>

<template>
  <Page :title="t('chat.title')" :description="t('chat.hint')" back="">
    <div class="w-full bg-base-100 rounded-md flex overflow-hidden min-h-[65vh]">
      <aside
        class="w-full lg:w-72 shrink-0 flex flex-col border-base-200 lg:border-r overflow-y-auto"
        :class="state.selected ? 'hidden lg:flex' : 'flex'"
      >
        <div v-if="state.loading" class="p-3 flex flex-col gap-2">
          <RowSkeleton v-for="n in 4" :key="n" />
        </div>
        <p v-else-if="!state.list.length" class="p-5 text-sm text-base-content/60">{{ t('chat.empty') }}</p>
        <template v-else>
          <button
            v-for="item in state.list"
            :key="item._id"
            class="w-full text-left p-3 flex items-start gap-2 border-b border-base-200/60 hover:bg-base-200/50 transition-colors"
            :class="state.selected == item._id ? 'bg-base-200' : ''"
            @click="open(item._id)"
          >
            <span class="shrink-0 size-9 rounded-full bg-base-200 flex justify-center items-center text-xs font-semibold uppercase">
              {{ item.participant.slice(0, 2) }}
            </span>
            <span class="flex-1 min-w-0 flex flex-col">
              <span class="flex items-center gap-2">
                <span class="text-sm font-medium truncate">{{ item.participant }}</span>
                <span class="ml-auto shrink-0 text-[11px] text-base-content/50">{{ formatRelative(item.lastMessageAt) }}</span>
              </span>
              <span class="text-xs text-base-content/60 truncate">{{ item.lastMessageText }}</span>
              <span class="flex items-center gap-1 mt-0.5">
                <span v-if="item.unread" class="badge badge-primary badge-xs">{{ item.unread }}</span>
                <span v-if="!item.canReply" class="badge badge-ghost badge-xs">{{ t('chat.closed') }}</span>
              </span>
            </span>
          </button>
          <div v-if="state.totalPages > 1" class="p-2">
            <UiPagination v-model="state.page" :total="state.totalPages" />
          </div>
        </template>
      </aside>

      <section class="flex-1 min-w-0 flex flex-col">
        <template v-if="state.loadingThread">
          <div class="p-3 flex flex-col gap-2"><RowSkeleton v-for="n in 5" :key="n" /></div>
        </template>

        <template v-else-if="state.chat">
          <header class="p-3 flex items-center gap-2 border-b border-base-200">
            <button class="btn btn-sm btn-square btn-ghost lg:hidden" :aria-label="t('chat.back')" @click="state.selected = ''">
              <Icon icon="mingcute:left-line" class="text-lg" />
            </button>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold truncate">{{ state.chat.participant }}</div>
              <div class="text-xs text-base-content/60 truncate">@{{ state.chat.account?.username || 'instagram' }}</div>
            </div>
          </header>

          <div ref="thread" class="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
            <div
              v-for="message in state.messages"
              :key="message._id"
              class="max-w-[85%] flex flex-col gap-0.5"
              :class="message.direction == 'out' ? 'self-end items-end' : 'self-start items-start'"
            >
              <p
                class="rounded-bubble [--bubble-r:0.875rem] px-3 py-2 text-sm whitespace-pre-wrap break-words"
                :class="message.direction == 'out' ? 'bg-primary text-primary-content' : 'bg-base-200'"
              >
                {{ message.text || '—' }}
              </p>
              <span class="text-[11px] text-base-content/50">
                {{ formatTime(message.createdAt) }}
                <template v-if="message.direction == 'out' && message.repliedBy">{{ ' · ' + t(`chat.by.${message.repliedBy}`) }}</template>
              </span>
              <span v-if="message.error" class="text-[11px] text-error">{{ t('chat.failed', { message: message.error }) }}</span>
            </div>
          </div>

          <div class="p-3 border-t border-base-200 flex flex-col gap-2">
            <p v-if="!state.chat.canReply" class="text-xs text-base-content/60">{{ t('chat.windowClosed') }}</p>
            <form class="flex items-end gap-2" @submit.prevent="send">
              <textarea
                v-model="state.draft"
                :disabled="!state.chat.canReply || state.sending"
                rows="1"
                class="textarea textarea-sm flex-1 resize-none"
                :placeholder="t('chat.placeholder')"
                @keydown.enter.exact.prevent="send"
              />
              <button class="btn btn-sm btn-primary" :disabled="!state.chat.canReply || state.sending || !state.draft.trim()">
                {{ state.sending ? t('chat.sending') : t('chat.send') }}
              </button>
            </form>
          </div>
        </template>

        <div v-else class="flex-1 flex justify-center items-center p-5 text-sm text-base-content/60">
          {{ t('chat.pick') }}
        </div>
      </section>
    </div>
  </Page>
</template>
