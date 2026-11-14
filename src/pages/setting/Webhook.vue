<script setup>
import { onMounted, reactive, ref, watch } from 'vue'
import { Icon } from '@iconify/vue'
import Page from '../../components/Page.vue'
import Section from '../../components/Section.vue'
import UiPagination from '../../components/UiPagination.vue'
import { t, formatRelative, formatDate, capitalize } from '../../i18n'
import { user, updateWebhooks, getWebhookLogs, retryWebhook } from '../../api'
import { showToast } from '../../toast'
import { copyText } from '../../clipboard'

const MAX = 10
const blank = (hook = {}) => ({ url: hook.url || '', token: hook.token || '', show: false })
const rows = (list = []) => (list.length ? list.map(blank) : [blank()])

const saved = ref(user.config.webhooks || [])
const form = reactive({ loading: false, webhooks: rows(saved.value) })

function removeRow(index) {
  form.webhooks.splice(index, 1)
  if (!form.webhooks.length) form.webhooks.push(blank())
}

async function save() {
  if (form.loading) return
  const list = form.webhooks.filter((hook) => hook.url.trim()).map((hook) => ({ url: hook.url.trim(), token: hook.token }))
  if (new Set(list.map((hook) => hook.url)).size != list.length) return showToast(t('webhook.form.duplicate'), 'error')
  form.loading = true
  try {
    saved.value = await updateWebhooks(list)
    form.webhooks = rows(saved.value)
    showToast(t('webhook.form.toast'), 'success')
  } catch (error) {
    showToast(error.message, 'error')
  }
  form.loading = false
}

// Payload examples use made-up data.
const fields = ['platform', 'type', 'accountId', 'data', 'raw']
const examples = {
  schedule: { platform: 'jawabin', type: 'schedule', accountId: 'acc_001', data: { id: 'sch_104', status: 'error', errorMessage: 'invalid access token' } },
  comment: {
    platform: 'instagram', type: 'comment', accountId: 'acc_001',
    data: {
      id: 'cmt_2201', status: 'pending',
      content: { id: 'post_88', type: 'video', owner: { id: 'usr_1', name: 'Toko Contoh' }, url: 'https://instagram.com/p/contoh' },
      comment: { id: 'c_901', type: 'text', text: 'Harganya berapa kak?', owner: { id: 'usr_2', name: 'pembeli_contoh' }, createdAt: '2026-05-07T12:51:00.000Z' },
    },
  },
  chat: {
    platform: 'instagram', type: 'chat', accountId: 'acc_001',
    data: {
      chat: { id: 'chat_55', senderName: 'Pembeli Contoh', unreadCount: 1 },
      message: { id: 'msg_771', isFromMe: false, type: 'text', text: 'Bisa COD?', createdAt: '2026-04-07T07:34:47.510Z' },
    },
  },
}
const selected = ref('schedule')

const history = reactive({ loading: true, filter: { url: '' }, open: {}, data: { docs: [], page: 1, totalPages: 1 } })
const statusIcons = { success: 'mingcute:check-circle-line', error: 'mingcute:close-circle-fill' }

function parse(doc) {
  try {
    return JSON.parse(doc.data || '{}') || {}
  } catch {
    return {}
  }
}
function title(doc) {
  const payload = parse(doc)
  const type = payload.type ? t(`webhook.form.example.type.${payload.type}`) : ''
  return [type, capitalize(payload.platform)].filter(Boolean).join(' · ')
}

async function load() {
  history.loading = true
  history.data.docs = []
  try {
    const { data } = await getWebhookLogs(history.data.page, 20, history.filter.url)
    Object.assign(history.data, data)
  } catch (error) {
    showToast(error.message, 'error')
  }
  history.loading = false
}

async function retry(doc) {
  doc.status = 'process'
  try {
    await retryWebhook(doc._id)
    await load()
    showToast(t('webhook.history.toast'), 'success')
  } catch (error) {
    showToast(error.message, 'error')
    load()
  }
}

onMounted(load)
watch(() => history.data.page, load)
watch(() => history.filter.url, () => (history.data.page == 1 ? load() : (history.data.page = 1)))
watch(saved, (list) => {
  if (!list.some((hook) => hook.url == history.filter.url)) history.filter.url = ''
})
</script>

<template>
  <Page :title="t('webhook.title')" :description="t('setting.hint.webhook')">
    <Section icon="mingcute:webhook-line" :title="t('webhook.form.title')" :description="t('webhook.form.subtitle')">
      <div v-for="(hook, index) in form.webhooks" :key="index" class="w-full flex flex-col gap-3 p-3 border border-base-300 rounded-bubble [--bubble-r:0.625rem]">
        <div class="w-full flex flex-col gap-1">
          <label :for="`webhook-url-${index}`" class="text-xs text-base-content/70">{{ t('webhook.form.url.label') }}</label>
          <div class="w-full flex items-center gap-2">
            <input :id="`webhook-url-${index}`" v-model="hook.url" type="url" class="flex-1 min-w-0 input" :placeholder="t('webhook.form.url.placeholder')" />
            <button
              type="button"
              class="btn btn-square shrink-0 text-base-content/60 hover:text-error"
              :title="t('webhook.form.remove')"
              :aria-label="t('webhook.form.remove')"
              @click="removeRow(index)"
            >
              <Icon icon="mingcute:delete-2-line" class="text-lg" />
            </button>
          </div>
        </div>
        <div class="w-full flex flex-col gap-1">
          <label :for="`webhook-token-${index}`" class="text-xs text-base-content/70">{{ t('webhook.form.token.label') }}</label>
          <label class="w-full input">
            <input
              :id="`webhook-token-${index}`"
              v-model.trim="hook.token"
              :type="hook.show ? 'text' : 'password'"
              class="w-full font-mono placeholder:font-sans"
              autocomplete="off"
              :placeholder="t('webhook.form.token.placeholder')"
            />
            <button
              type="button"
              class="cursor-pointer text-base-content/60 hover:text-base-content"
              :aria-label="hook.show ? t('webhook.form.hide') : t('webhook.form.show')"
              @click="hook.show = !hook.show"
            >
              <Icon :icon="hook.show ? 'mingcute:eye-close-line' : 'mingcute:eye-2-line'" />
            </button>
          </label>
        </div>
      </div>
      <button type="button" class="btn btn-sm btn-block border-dashed" :disabled="form.webhooks.length >= MAX" @click="form.webhooks.push(blank())">
        <Icon icon="mingcute:add-line" />
        {{ t('webhook.form.add') }}
        <span class="text-base-content/60">{{ form.webhooks.length }}/{{ MAX }}</span>
      </button>
      <span class="flex items-start gap-1.5 text-xs text-base-content/60">
        <Icon icon="mingcute:information-line" class="shrink-0 mt-px" />
        {{ t('webhook.form.alert') }}
      </span>
      <div class="w-full flex sm:flex-row flex-col sm:items-center gap-3 pt-4 border-t border-base-200">
        <p class="flex-1 text-xs text-base-content/60">{{ t('webhook.form.test') }}</p>
        <button class="btn btn-primary btn-sm" :disabled="form.loading" @click="save">
          <span v-if="form.loading" class="loading loading-xs" />
          {{ t('webhook.form.button') }}
        </button>
      </div>
    </Section>

    <Section icon="mingcute:code-line" :title="t('webhook.form.example.title')" :description="t('webhook.form.example.subtitle')">
      <dl class="w-full flex flex-col">
        <div v-for="field in fields" :key="field" class="w-full grid grid-cols-[6rem_1fr] gap-3 py-2 border-b border-base-200 last:border-b-0 text-xs">
          <dt class="font-mono font-medium">{{ field }}</dt>
          <dd class="text-base-content/70">{{ t(`webhook.form.example.fields.${field}`) }}</dd>
        </div>
      </dl>
      <div class="w-full flex flex-col gap-2">
        <div class="w-full flex items-center gap-1.5">
          <div class="flex-1 flex items-center gap-1.5" role="tablist">
            <button
              v-for="type in Object.keys(examples)"
              :key="type"
              role="tab"
              :aria-selected="selected == type"
              class="btn btn-xs"
              :class="{ 'btn-primary': selected == type }"
              @click="selected = type"
            >
              {{ t(`webhook.form.example.type.${type}`) }}
            </button>
          </div>
          <button class="btn btn-xs btn-ghost" @click="copyText(JSON.stringify(examples[selected]), t('webhook.form.example.copied'))">
            <Icon icon="mingcute:copy-2-line" />
            {{ t('webhook.form.example.copy') }}
          </button>
        </div>
        <pre class="w-full max-h-80 overflow-auto p-3 bg-base-200 rounded-bubble [--bubble-r:0.625rem] text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-all">{{ JSON.stringify(examples[selected], null, 2) }}</pre>
      </div>
    </Section>

    <div class="w-full bg-base-100 rounded-md flex flex-col overflow-hidden">
      <div class="px-5 pt-5 pb-3 flex sm:flex-row flex-col sm:items-center gap-3">
        <div class="flex-1 min-w-0 flex flex-col gap-0.5">
          <h2 class="text-sm font-semibold">{{ t('webhook.history.title') }}</h2>
          <p class="text-xs text-base-content/60">{{ t('webhook.history.subtitle') }}</p>
        </div>
        <select v-if="saved.length > 1" v-model="history.filter.url" class="select select-sm sm:w-56 w-full" :aria-label="t('webhook.history.filter')">
          <option value="">{{ t('webhook.history.all') }}</option>
          <option v-for="hook in saved" :key="hook.url" :value="hook.url">{{ hook.url }}</option>
        </select>
      </div>

      <div v-for="doc in history.data.docs" :key="doc._id" class="w-full flex flex-col border-t border-base-200">
        <div class="w-full flex items-center gap-3 px-5 py-3">
          <button
            type="button"
            class="flex-1 min-w-0 flex items-center gap-3 text-left cursor-pointer group"
            :aria-expanded="!!history.open[doc._id]"
            @click="history.open[doc._id] = !history.open[doc._id]"
          >
            <span
              class="shrink-0 size-9 rounded-bubble [--bubble-r:0.5rem] flex justify-center items-center"
              :class="doc.status == 'error' ? 'bg-error/10 text-error' : 'bg-base-200'"
            >
              <span v-if="doc.status == 'process'" class="loading loading-xs" />
              <Icon v-else :icon="statusIcons[doc.status] || 'mingcute:time-line'" />
            </span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-medium line-clamp-1 group-hover:underline underline-offset-2">
                {{ title(doc) || t(`webhook.history.status.${doc.status}`) }}
              </div>
              <div class="text-xs text-base-content/60 line-clamp-1">
                {{ t(`webhook.history.status.${doc.status}`) }} ·
                <span :title="formatDate(doc.createdAt)">{{ formatRelative(doc.createdAt) }}</span>
              </div>
              <div v-if="doc.url" class="text-xs text-base-content/50 truncate" :title="doc.url">{{ doc.url }}</div>
              <div v-if="doc.status == 'error'" class="text-xs text-error wrap-anywhere line-clamp-2">{{ doc.errorMessage }}</div>
            </div>
          </button>
          <button class="btn btn-sm shrink-0" :disabled="doc.status == 'process'" :aria-label="t('webhook.history.retry')" @click="retry(doc)">
            <Icon icon="mingcute:refresh-2-line" />
            <span class="sm:inline hidden">{{ t('webhook.history.retry') }}</span>
          </button>
        </div>
        <div v-if="history.open[doc._id]" class="w-full flex flex-col gap-1.5 px-5 pb-4 sm:pl-17">
          <div class="w-full flex items-center justify-between gap-3">
            <span class="text-xs text-base-content/60">{{ t('webhook.history.payload') }}</span>
            <button class="btn btn-xs btn-ghost" @click="copyText(JSON.stringify(parse(doc)), t('webhook.history.copied'))">
              <Icon icon="mingcute:copy-2-line" />
              {{ t('webhook.history.copy') }}
            </button>
          </div>
          <pre class="max-h-72 overflow-auto p-3 bg-base-200 rounded-bubble [--bubble-r:0.625rem] text-[11px] leading-relaxed font-mono whitespace-pre-wrap break-all">{{ JSON.stringify(parse(doc), null, 2) }}</pre>
        </div>
      </div>

      <template v-if="history.loading">
        <div v-for="n in 8" :key="n" class="w-full flex items-center gap-3 px-5 py-3.5 border-t border-base-200">
          <div class="shrink-0 size-9 rounded-md skeleton" />
          <div class="flex-1 flex flex-col gap-2">
            <div class="w-36 h-2.5 skeleton" />
            <div class="w-24 h-2 skeleton" />
          </div>
          <div class="shrink-0 w-20 h-7 skeleton" />
        </div>
      </template>

      <div v-if="!history.loading && !history.data.docs.length" class="w-full flex flex-col justify-center items-center gap-2 py-16 border-t border-base-200">
        <Icon icon="mingcute:webhook-line" class="text-2xl" />
        <div class="text-center text-sm font-medium">{{ t('webhook.history.empty') }}</div>
      </div>

      <div v-if="history.data.totalPages > 1" class="w-full flex justify-end p-4 border-t border-base-200">
        <UiPagination v-model="history.data.page" :total="history.data.totalPages" />
      </div>
    </div>
  </Page>
</template>
