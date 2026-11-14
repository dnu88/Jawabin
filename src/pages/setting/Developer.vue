<script setup>
import { computed, onMounted, reactive } from 'vue'
import { Icon } from '@iconify/vue'
import Page from '../../components/Page.vue'
import Section from '../../components/Section.vue'
import UiModal from '../../components/UiModal.vue'
import { t } from '../../i18n'
import { getApps, createApp, updateApp, rotateAppSecret, removeApp, API_BASE } from '../../api'
import { showToast } from '../../toast'
import { confirm } from '../../confirm'
import { copyText } from '../../clipboard'
import { helpLinks } from '../../menu'

const MAX_APPS = 10
const MAX_URIS = 10
const support = helpLinks.find((link) => link.key == 'customerService').path
const docs = helpLinks.find((link) => link.key == 'documentation').path
const copy = (text, label) => copyText(text, t('developer.copied', { label }))

const endpoints = computed(() => [
  { key: 'authorize', method: 'GET', url: `${window.location.origin}/oauth/authorize` },
  { key: 'token', method: 'POST', url: `${API_BASE}/public/oauth/token` },
  { key: 'revoke', method: 'POST', url: `${API_BASE}/public/oauth/revoke` },
  { key: 'profile', method: 'GET', url: `${API_BASE}/public/me` },
])

const list = reactive({ loading: true, docs: [] })
const form = reactive({ open: false, doc: null, loading: false, submitted: false, name: '', description: '', website: '', logo: '', type: 'confidential', redirectUris: [''] })
const secret = reactive({ open: false, app: null, value: '', copied: false })

const uris = computed(() => form.redirectUris.map((uri) => uri.trim()).filter(Boolean))
const errors = computed(() => ({
  name: form.name.trim() ? '' : t('developer.form.name.required'),
  redirect: uris.value.length ? '' : t('developer.form.redirect.required'),
}))

async function load() {
  list.loading = true
  try {
    list.docs = (await getApps()).data
  } catch (error) {
    showToast(error.message, 'error')
  }
  list.loading = false
}

function openForm(doc = null) {
  Object.assign(form, {
    open: true, doc, loading: false, submitted: false,
    name: doc?.name || '', description: doc?.description || '', website: doc?.website || '', logo: doc?.logo || '',
    type: doc?.type || 'confidential', redirectUris: doc?.redirectUris?.length ? [...doc.redirectUris] : [''],
  })
}
function removeUri(index) {
  form.redirectUris.splice(index, 1)
  if (!form.redirectUris.length) form.redirectUris.push('')
}
function showSecret(app, value) {
  Object.assign(secret, { open: true, app, value, copied: false })
}

async function submit() {
  form.submitted = true
  if (errors.value.name || errors.value.redirect || form.loading) return
  form.loading = true
  const values = { name: form.name.trim(), description: form.description.trim(), website: form.website.trim(), logo: form.logo.trim(), redirectUris: uris.value }
  try {
    if (form.doc) {
      await updateApp(form.doc._id, values)
      showToast(t('developer.form.toast.update'), 'success')
    } else {
      const { data } = await createApp({ ...values, type: form.type })
      showToast(t('developer.form.toast.create'), 'success')
      if (data.clientSecret) showSecret(data, data.clientSecret)
    }
    form.open = false
    load()
  } catch (error) {
    showToast(error.message, 'error')
  }
  form.loading = false
}

function rotate(doc) {
  confirm({
    title: t('developer.rotate.title'),
    message: t('developer.rotate.message'),
    onConfirm: async () => {
      try {
        const { data } = await rotateAppSecret(doc._id)
        await load()
        showSecret(doc, data.clientSecret)
      } catch (error) {
        showToast(error.message, 'error')
      }
    },
  })
}
function remove(doc) {
  confirm({
    title: t('developer.remove.title'),
    message: t('developer.remove.message', { name: doc.name }),
    onConfirm: async () => {
      try {
        await removeApp(doc._id)
        showToast(t('developer.remove.toast'), 'success')
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
  <Page :title="t('developer.title')" :description="t('setting.hint.developer')">
    <template #action>
      <button class="btn btn-primary btn-sm" :disabled="list.loading || list.docs.length >= MAX_APPS" @click="openForm()">
        <Icon icon="mingcute:add-line" />
        <span class="sm:inline hidden">{{ t('developer.create') }}</span>
      </button>
    </template>

    <Section icon="mingcute:route-line" :title="t('developer.endpoint.title')" :description="t('developer.endpoint.subtitle')">
      <ul class="w-full flex flex-col gap-1.5">
        <li v-for="item in endpoints" :key="item.key" class="w-full flex items-center gap-2 pl-3 pr-1 py-1 bg-base-200 rounded-bubble [--bubble-r:0.5rem]">
          <span class="shrink-0 sm:w-28 w-20 text-xs text-base-content/70">{{ t(`developer.endpoint.${item.key}`) }}</span>
          <span class="shrink-0 w-10 text-[11px] font-mono font-semibold text-base-content/60">{{ item.method }}</span>
          <span class="flex-1 min-w-0 text-xs font-mono truncate" :title="item.url">{{ item.url }}</span>
          <button class="shrink-0 btn btn-xs btn-ghost btn-square" :aria-label="t('developer.copy')" :title="t('developer.copy')" @click="copy(item.url, t(`developer.endpoint.${item.key}`))">
            <Icon icon="mingcute:copy-2-line" />
          </button>
        </li>
      </ul>
      <div class="w-full flex sm:flex-row flex-col sm:items-center gap-3 pt-4 border-t border-base-200">
        <p class="flex-1 text-xs text-base-content/60">{{ t('developer.endpoint.hint') }}</p>
        <a :href="docs" class="btn btn-sm">
          {{ t('developer.endpoint.docs') }}
          <Icon icon="mingcute:external-link-line" />
        </a>
      </div>
    </Section>

    <div class="w-full bg-base-100 rounded-md flex flex-col overflow-hidden">
      <div class="px-5 py-3 flex items-center justify-between gap-2 text-xs text-base-content/60">
        <span class="flex items-center gap-2">
          <Icon icon="mingcute:layout-grid-line" class="shrink-0" />
          {{ t('developer.list') }}
        </span>
        <span>{{ list.docs.length }}/{{ MAX_APPS }}</span>
      </div>

      <div v-for="doc in list.docs" :key="doc._id" class="w-full flex flex-col gap-4 px-5 py-4 border-t border-base-200">
        <div class="w-full flex items-start gap-3">
          <span class="shrink-0 size-10 rounded-bubble [--bubble-r:0.625rem] bg-base-200 overflow-hidden flex justify-center items-center font-semibold uppercase">
            {{ doc.name?.[0] }}
          </span>
          <div class="flex-1 min-w-0 flex flex-col gap-1">
            <div class="flex flex-wrap items-center gap-1.5">
              <span class="text-sm font-semibold line-clamp-1 break-all">{{ doc.name }}</span>
              <span class="px-1.5 py-px text-[11px] font-medium bg-base-200 rounded-bubble [--bubble-r:0.35rem]" :title="t(`developer.type.${doc.type}.hint`)">
                {{ t(`developer.type.${doc.type}.label`) }}
              </span>
              <span v-if="doc.isVerified" class="flex items-center gap-1 px-1.5 py-px text-[11px] font-medium bg-success/10 text-success rounded-bubble [--bubble-r:0.35rem]">
                <Icon icon="mingcute:certificate-line" />
                {{ t('developer.verified') }}
              </span>
              <span v-else class="flex items-center gap-1 px-1.5 py-px text-[11px] font-medium bg-warning/15 rounded-bubble [--bubble-r:0.35rem]">
                <Icon icon="mingcute:warning-line" />
                {{ t('developer.unverified') }}
              </span>
            </div>
            <p v-if="doc.description" class="text-xs text-base-content/60 line-clamp-2">{{ doc.description }}</p>
          </div>
          <div class="shrink-0 flex items-center gap-1">
            <button class="btn btn-sm btn-square btn-ghost" :aria-label="t('developer.edit')" :title="t('developer.edit')" @click="openForm(doc)">
              <Icon icon="mingcute:edit-2-line" />
            </button>
            <button class="btn btn-sm btn-square btn-ghost text-error" :aria-label="t('developer.remove.button')" :title="t('developer.remove.button')" @click="remove(doc)">
              <Icon icon="mingcute:delete-2-line" />
            </button>
          </div>
        </div>

        <div v-if="!doc.isVerified" class="w-full flex sm:flex-row flex-col sm:items-center gap-3 px-3 py-2.5 text-xs bg-warning/10 rounded-bubble [--bubble-r:0.5rem]">
          <span class="flex-1 min-w-0">{{ t('developer.verify.hint') }}</span>
          <a :href="support" class="shrink-0 btn btn-sm">
            <Icon icon="mingcute:whatsapp-line" />
            {{ t('developer.verify.button') }}
          </a>
        </div>

        <div class="w-full grid sm:grid-cols-2 grid-cols-1 gap-3">
          <div class="min-w-0 flex flex-col gap-1">
            <span class="text-xs text-base-content/70">{{ t('developer.clientId') }}</span>
            <div class="w-full flex items-center gap-2">
              <input type="text" class="flex-1 min-w-0 input input-sm font-mono" readonly :value="doc.clientId" :aria-label="t('developer.clientId')" />
              <button class="btn btn-sm btn-square" :aria-label="t('developer.copy')" :title="t('developer.copy')" @click="copy(doc.clientId, t('developer.clientId'))">
                <Icon icon="mingcute:copy-2-line" />
              </button>
            </div>
          </div>
          <div class="min-w-0 flex flex-col gap-1">
            <span class="text-xs text-base-content/70">{{ t('developer.clientSecret') }}</span>
            <div v-if="doc.type == 'confidential'" class="w-full flex items-center gap-2">
              <input
                type="text"
                class="flex-1 min-w-0 input input-sm font-mono text-base-content/60"
                readonly
                :value="`jwb_secret_••••${doc.clientSecretHint}`"
                :aria-label="t('developer.clientSecret')"
              />
              <button class="btn btn-sm text-error" @click="rotate(doc)">
                <Icon icon="mingcute:refresh-2-line" />
                <span class="sm:inline hidden">{{ t('developer.rotate.button') }}</span>
              </button>
            </div>
            <p v-else class="text-xs text-base-content/60 py-1.5">{{ t('developer.noSecret') }}</p>
          </div>
        </div>

        <div class="w-full flex flex-col gap-1">
          <span class="text-xs text-base-content/70">{{ t('developer.form.redirect.label') }}</span>
          <ul class="w-full flex flex-col gap-1">
            <li v-for="uri in doc.redirectUris" :key="uri" class="w-full px-2.5 py-1 bg-base-200 rounded-bubble [--bubble-r:0.4rem] text-xs font-mono break-all">{{ uri }}</li>
          </ul>
        </div>
      </div>

      <div v-if="list.loading && !list.docs.length" class="w-full flex justify-center py-12 border-t border-base-200">
        <span class="loading loading-sm" />
      </div>

      <div v-if="!list.loading && !list.docs.length" class="w-full flex flex-col justify-center items-center gap-2 px-5 py-14 border-t border-base-200 text-center">
        <Icon icon="mingcute:code-line" class="text-2xl" />
        <div class="text-sm font-medium">{{ t('developer.empty.title') }}</div>
        <p class="max-w-sm text-xs text-base-content/60">{{ t('developer.empty.message') }}</p>
        <button class="btn btn-sm mt-2" @click="openForm()">
          <Icon icon="mingcute:add-line" />
          {{ t('developer.create') }}
        </button>
      </div>
    </div>
  </Page>

  <UiModal v-model="form.open" :title="t(form.doc ? 'developer.form.title.edit' : 'developer.form.title.create')">
    <form class="w-full flex flex-col gap-5" @submit.prevent="submit">
      <div class="flex flex-col gap-1">
        <label for="developer-name" class="text-xs text-base-content/70">{{ t('developer.form.name.label') }}</label>
        <input
          id="developer-name"
          v-model="form.name"
          type="text"
          maxlength="50"
          class="w-full input"
          :class="{ 'input-error': form.submitted && errors.name }"
          :placeholder="t('developer.form.name.placeholder')"
        />
        <span v-if="form.submitted && errors.name" class="text-xs text-error">{{ errors.name }}</span>
        <p class="text-xs text-base-content/60">{{ t('developer.form.name.hint') }}</p>
      </div>
      <div class="flex flex-col gap-1">
        <label for="developer-description" class="text-xs text-base-content/70">{{ t('developer.form.description.label') }}</label>
        <textarea id="developer-description" v-model="form.description" rows="2" maxlength="300" class="w-full textarea" :placeholder="t('developer.form.description.placeholder')" />
      </div>
      <div class="w-full grid sm:grid-cols-2 grid-cols-1 gap-3">
        <div class="min-w-0 flex flex-col gap-1">
          <label for="developer-website" class="text-xs text-base-content/70">{{ t('developer.form.website.label') }}</label>
          <input id="developer-website" v-model="form.website" type="url" class="w-full input" placeholder="https://example.com" />
        </div>
        <div class="min-w-0 flex flex-col gap-1">
          <label for="developer-logo" class="text-xs text-base-content/70">{{ t('developer.form.logo.label') }}</label>
          <input id="developer-logo" v-model="form.logo" type="url" class="w-full input" placeholder="https://example.com/logo.png" />
        </div>
      </div>
      <fieldset v-if="!form.doc" class="flex flex-col gap-1.5">
        <legend class="text-xs text-base-content/70 pb-1">{{ t('developer.form.type') }}</legend>
        <label
          v-for="type in ['confidential', 'public']"
          :key="type"
          class="w-full flex items-start gap-3 p-3 border rounded-bubble [--bubble-r:0.625rem] cursor-pointer transition-colors"
          :class="form.type == type ? 'border-primary bg-primary/5' : 'border-base-300'"
        >
          <input v-model="form.type" type="radio" name="developer-type" class="radio radio-sm mt-0.5" :value="type" />
          <span class="flex-1 min-w-0 flex flex-col gap-0.5">
            <span class="text-sm font-medium">{{ t(`developer.type.${type}.label`) }}</span>
            <span class="text-xs text-base-content/60">{{ t(`developer.type.${type}.hint`) }}</span>
          </span>
        </label>
      </fieldset>
      <div class="flex flex-col gap-1.5">
        <span class="text-xs text-base-content/70">{{ t('developer.form.redirect.label') }}</span>
        <div v-for="(uri, index) in form.redirectUris" :key="index" class="w-full flex items-center gap-2">
          <input
            v-model="form.redirectUris[index]"
            type="text"
            inputmode="url"
            class="flex-1 min-w-0 input font-mono text-sm"
            :class="{ 'input-error': form.submitted && errors.redirect }"
            :aria-label="t('developer.form.redirect.label')"
            placeholder="https://example.com/callback"
          />
          <button
            type="button"
            class="btn btn-square shrink-0 text-base-content/60 hover:text-error"
            :title="t('developer.form.redirect.remove')"
            :aria-label="t('developer.form.redirect.remove')"
            @click="removeUri(index)"
          >
            <Icon icon="mingcute:delete-2-line" class="text-lg" />
          </button>
        </div>
        <button type="button" class="btn btn-sm btn-block border-dashed" :disabled="form.redirectUris.length >= MAX_URIS" @click="form.redirectUris.push('')">
          <Icon icon="mingcute:add-line" />
          {{ t('developer.form.redirect.add') }}
          <span class="text-base-content/60">{{ form.redirectUris.length }}/{{ MAX_URIS }}</span>
        </button>
        <span v-if="form.submitted && errors.redirect" class="text-xs text-error">{{ errors.redirect }}</span>
        <p class="text-xs text-base-content/60">{{ t('developer.form.redirect.hint') }}</p>
      </div>
      <div class="w-full flex items-center gap-3">
        <button type="button" class="btn flex-1" :disabled="form.loading" @click="form.open = false">{{ t('developer.form.button.cancel') }}</button>
        <button type="submit" class="btn btn-primary flex-1" :disabled="form.loading">
          <span v-if="form.loading" class="loading loading-xs" />
          {{ t(form.doc ? 'developer.form.button.save' : 'developer.form.button.create') }}
        </button>
      </div>
    </form>
  </UiModal>

  <UiModal v-model="secret.open" :title="t('developer.secret.title')">
    <div v-if="secret.app" class="w-full flex flex-col gap-5">
      <div class="w-full flex items-start gap-2 px-3 py-2 text-xs bg-warning/10 rounded-bubble [--bubble-r:0.5rem]">
        <Icon icon="mingcute:warning-line" class="shrink-0 mt-px text-warning" />
        <span>{{ t('developer.secret.warning') }}</span>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-xs text-base-content/70">{{ t('developer.clientId') }}</span>
        <div class="w-full flex items-center gap-2">
          <input type="text" class="flex-1 min-w-0 input font-mono" readonly :value="secret.app.clientId" :aria-label="t('developer.clientId')" />
          <button class="btn btn-square" :aria-label="t('developer.copy')" :title="t('developer.copy')" @click="copy(secret.app.clientId, t('developer.clientId'))">
            <Icon icon="mingcute:copy-2-line" />
          </button>
        </div>
      </div>
      <div class="flex flex-col gap-1">
        <span class="text-xs text-base-content/70">{{ t('developer.clientSecret') }}</span>
        <div class="w-full flex items-center gap-2">
          <input type="text" class="flex-1 min-w-0 input font-mono" readonly :value="secret.value" :aria-label="t('developer.clientSecret')" />
          <button
            class="btn btn-square"
            :class="{ 'btn-primary': !secret.copied }"
            :aria-label="t('developer.copy')"
            :title="t('developer.copy')"
            @click="copy(secret.value, t('developer.clientSecret')); secret.copied = true"
          >
            <Icon :icon="secret.copied ? 'mingcute:check-line' : 'mingcute:copy-2-line'" />
          </button>
        </div>
      </div>
      <button class="btn w-full" :class="{ 'btn-primary': secret.copied }" @click="secret.open = false">{{ t('developer.secret.done') }}</button>
    </div>
  </UiModal>
</template>
