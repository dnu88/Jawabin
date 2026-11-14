<script setup>
import { onMounted, reactive } from 'vue'
import { Icon } from '@iconify/vue'
import Page from '../components/Page.vue'
import UiModal from '../components/UiModal.vue'
import { t } from '../i18n'
import { getRules, saveRule, removeRule, getAccounts } from '../api'
import { showToast } from '../toast'
import { confirm } from '../confirm'

const state = reactive({ loading: true, docs: [], accounts: [] })
const form = reactive({ open: false, id: '', loading: false, error: '', name: '', type: 'keyword', channel: 'comment', keywords: '', reply: '', prompt: '', accountId: '', isActive: true })

const accountName = (id) => {
  const account = state.accounts.find((item) => item._id == id)
  return account ? `@${account.username}` : t('automation.all')
}
const values = (rule) => ({ name: rule.name, type: rule.type, channel: rule.channel || 'comment', keywords: rule.keywords, reply: rule.reply, prompt: rule.prompt, accountId: rule.accountId, isActive: rule.isActive })

async function load() {
  state.loading = true
  try {
    const [rules, accounts] = await Promise.all([getRules(), getAccounts()])
    Object.assign(state, { docs: rules, accounts })
  } catch (error) {
    showToast(error.message, 'error')
  }
  state.loading = false
}

function openForm(rule = null) {
  Object.assign(form, {
    open: true, id: rule?._id || '', loading: false, error: '',
    name: rule?.name || '', type: rule?.type || 'keyword', channel: rule?.channel || 'comment', keywords: (rule?.keywords || []).join(', '),
    reply: rule?.reply || '', prompt: rule?.prompt || '', accountId: rule?.accountId || '', isActive: rule?.isActive ?? true,
  })
}

async function submit() {
  if (form.loading) return
  const keywords = form.keywords.split(',').map((word) => word.trim()).filter(Boolean)
  const filled = form.name.trim() && (form.type == 'keyword' ? keywords.length && form.reply.trim() : form.prompt.trim())
  form.error = filled ? '' : t('automation.form.required')
  if (form.error) return
  form.loading = true
  try {
    await saveRule(form.id, { name: form.name.trim(), type: form.type, channel: form.channel, keywords, reply: form.reply.trim(), prompt: form.prompt.trim(), accountId: form.accountId, isActive: form.isActive })
    showToast(t('automation.toast.saved'), 'success')
    form.open = false
    load()
  } catch (error) {
    form.error = error.message
  }
  form.loading = false
}

async function toggle(rule) {
  try {
    await saveRule(rule._id, { ...values(rule), isActive: !rule.isActive })
    rule.isActive = !rule.isActive
  } catch (error) {
    showToast(error.message, 'error')
  }
}

function remove(rule) {
  confirm({
    title: t('automation.alert.title'),
    message: t('automation.alert.message', { name: rule.name }),
    onConfirm: async () => {
      try {
        await removeRule(rule._id)
        showToast(t('automation.toast.removed'), 'success')
        load()
      } catch (error) {
        showToast(error.message, 'error')
      }
    },
  })
}

onMounted(load)
</script>

<template>
  <Page :title="t('automation.title')" :description="t('automation.hint')" back="">
    <template #action>
      <button class="btn btn-primary btn-sm" @click="openForm()">
        <Icon icon="mingcute:add-line" />
        <span class="sm:inline hidden">{{ t('automation.create') }}</span>
      </button>
    </template>

    <div class="w-full bg-base-100 rounded-md flex flex-col overflow-hidden">
      <div class="px-5 py-3 flex items-start gap-2 text-xs text-base-content/60">
        <Icon icon="mingcute:information-line" class="shrink-0 mt-px" />
        {{ t('automation.order') }}
      </div>

      <div v-for="rule in state.docs" :key="rule._id" class="w-full flex items-start gap-3 px-5 py-3.5 border-t border-base-200">
        <span class="shrink-0 size-9 rounded-bubble [--bubble-r:0.5rem] bg-base-200 flex justify-center items-center">
          <Icon :icon="rule.type == 'ai' ? 'mingcute:ai-line' : 'mingcute:flash-line'" />
        </span>
        <div class="flex-1 min-w-0 flex flex-col gap-1" :class="{ 'opacity-50': !rule.isActive }">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="text-sm font-medium break-all">{{ rule.name }}</span>
            <span class="px-1.5 py-px text-[11px] font-medium bg-base-200 rounded-bubble [--bubble-r:0.35rem]">{{ t(`automation.type.${rule.type}`) }}</span>
            <span
              v-if="(rule.channel || 'comment') != 'comment'"
              class="px-1.5 py-px text-[11px] font-medium bg-base-200 rounded-bubble [--bubble-r:0.35rem]"
            >{{ t(`automation.channel.${rule.channel || 'comment'}`) }}</span>
            <span class="text-xs text-base-content/60">{{ accountName(rule.accountId) }}</span>
          </div>
          <div v-if="rule.type == 'keyword'" class="flex flex-wrap gap-1">
            <span v-for="word in rule.keywords" :key="word" class="px-1.5 py-px text-[11px] font-mono bg-base-200 rounded-bubble [--bubble-r:0.35rem]">{{ word }}</span>
          </div>
          <p class="text-xs text-base-content/60 line-clamp-2 wrap-anywhere">{{ rule.type == 'keyword' ? rule.reply : rule.prompt }}</p>
        </div>
        <div class="shrink-0 flex items-center gap-1">
          <input type="checkbox" class="toggle toggle-sm mr-1" :checked="rule.isActive" :aria-label="t('automation.active')" @change="toggle(rule)" />
          <button class="btn btn-sm btn-square btn-ghost" :aria-label="t('automation.edit')" :title="t('automation.edit')" @click="openForm(rule)">
            <Icon icon="mingcute:edit-2-line" />
          </button>
          <button class="btn btn-sm btn-square btn-ghost text-error" :aria-label="t('automation.remove')" :title="t('automation.remove')" @click="remove(rule)">
            <Icon icon="mingcute:delete-2-line" />
          </button>
        </div>
      </div>

      <div v-if="state.loading && !state.docs.length" class="w-full flex justify-center py-12 border-t border-base-200">
        <span class="loading loading-sm" />
      </div>

      <div v-if="!state.loading && !state.docs.length" class="w-full flex flex-col justify-center items-center gap-2 px-5 py-16 border-t border-base-200 text-center">
        <Icon icon="mingcute:flash-line" class="text-2xl" />
        <div class="text-sm font-medium">{{ t('automation.empty.title') }}</div>
        <p class="max-w-sm text-xs text-base-content/60">{{ t('automation.empty.message') }}</p>
      </div>
    </div>
  </Page>

  <UiModal v-model="form.open" :title="t(form.id ? 'automation.form.edit' : 'automation.form.create')">
    <form class="w-full flex flex-col gap-4" @submit.prevent="submit">
      <div class="flex flex-col gap-1">
        <label for="rule-name" class="text-xs text-base-content/70">{{ t('automation.form.name') }}</label>
        <input id="rule-name" v-model="form.name" type="text" maxlength="80" class="w-full input" :placeholder="t('automation.form.namePlaceholder')" />
      </div>
      <div class="flex flex-col gap-1">
        <label for="rule-channel" class="text-xs text-base-content/70">{{ t('automation.form.channel') }}</label>
        <select id="rule-channel" v-model="form.channel" class="w-full select">
          <option value="comment">{{ t('automation.channel.comment') }}</option>
          <option value="chat">{{ t('automation.channel.chat') }}</option>
          <option value="both">{{ t('automation.channel.both') }}</option>
        </select>
        <p class="text-xs text-base-content/60">{{ t('automation.form.channelHint') }}</p>
      </div>
      <div class="w-full grid grid-cols-2 gap-3">
        <div class="min-w-0 flex flex-col gap-1">
          <label for="rule-type" class="text-xs text-base-content/70">{{ t('automation.form.kind') }}</label>
          <select id="rule-type" v-model="form.type" class="w-full select">
            <option value="keyword">{{ t('automation.type.keyword') }}</option>
            <option value="ai">{{ t('automation.type.ai') }}</option>
          </select>
        </div>
        <div class="min-w-0 flex flex-col gap-1">
          <label for="rule-account" class="text-xs text-base-content/70">{{ t('automation.form.account') }}</label>
          <select id="rule-account" v-model="form.accountId" class="w-full select">
            <option value="">{{ t('automation.all') }}</option>
            <option v-for="account in state.accounts" :key="account._id" :value="account._id">@{{ account.username }}</option>
          </select>
        </div>
      </div>
      <template v-if="form.type == 'keyword'">
        <div class="flex flex-col gap-1">
          <label for="rule-keywords" class="text-xs text-base-content/70">{{ t('automation.form.keywords') }}</label>
          <input id="rule-keywords" v-model="form.keywords" type="text" class="w-full input" placeholder="harga, price, berapa" />
          <p class="text-xs text-base-content/60">{{ t('automation.form.keywordsHint') }}</p>
        </div>
        <div class="flex flex-col gap-1">
          <label for="rule-reply" class="text-xs text-base-content/70">{{ t('automation.form.reply') }}</label>
          <textarea id="rule-reply" v-model="form.reply" rows="3" maxlength="1000" class="w-full textarea" />
        </div>
      </template>
      <div v-else class="flex flex-col gap-1">
        <label for="rule-prompt" class="text-xs text-base-content/70">{{ t('automation.form.prompt') }}</label>
        <textarea id="rule-prompt" v-model="form.prompt" rows="5" maxlength="4000" class="w-full textarea" />
        <p class="text-xs text-base-content/60">{{ t('automation.form.promptHint') }}</p>
      </div>
      <label class="flex items-center justify-between gap-3 text-sm cursor-pointer">
        {{ t('automation.active') }}
        <input v-model="form.isActive" type="checkbox" class="toggle toggle-sm" />
      </label>
      <span v-if="form.error" class="text-xs text-error" role="alert">{{ form.error }}</span>
      <div class="w-full flex items-center gap-3">
        <button type="button" class="btn flex-1" :disabled="form.loading" @click="form.open = false">{{ t('automation.form.cancel') }}</button>
        <button type="submit" class="btn btn-primary flex-1" :disabled="form.loading">
          <span v-if="form.loading" class="loading loading-xs" />
          {{ t('automation.form.save') }}
        </button>
      </div>
    </form>
  </UiModal>
</template>
