<script setup>
import { reactive } from 'vue'
import { Icon } from '@iconify/vue'
import Page from '../../components/Page.vue'
import Section from '../../components/Section.vue'
import { t } from '../../i18n'
import { user, updateNotification } from '../../api'
import { showToast } from '../../toast'

const rows = [
  { key: 'transaction', icon: 'mingcute:bank-card-line' },
  { key: 'expired', icon: 'mingcute:calendar-time-add-line' },
  { key: 'account', icon: 'mingcute:user-add-2-line' },
  { key: 'affiliate', icon: 'mingcute:cash-2-line' },
]
const saved = () => user.config.notification || {}
const state = reactive({ loading: false, ...Object.fromEntries(rows.map((row) => [row.key, !!saved()[row.key]])) })

// Saves on every toggle; a failed save puts the switches back.
async function save() {
  if (state.loading) return
  state.loading = true
  try {
    await updateNotification(Object.fromEntries(rows.map((row) => [row.key, state[row.key]])))
    showToast(t('notification.toast'), 'success')
  } catch (error) {
    showToast(error.message, 'error')
    rows.forEach((row) => (state[row.key] = !!saved()[row.key]))
  }
  state.loading = false
}
</script>

<template>
  <Page :title="t('notification.title')" :description="t('setting.hint.notification')">
    <Section icon="mingcute:mail-line" :title="t('notification.channel')" :description="t('notification.email', { email: user.email })">
      <div class="w-full flex flex-col border-t border-base-200">
        <label
          v-for="row in rows"
          :key="row.key"
          class="w-full flex items-center gap-3 py-3.5 border-b border-base-200 last:border-b-0 last:pb-0 cursor-pointer"
        >
          <Icon :icon="row.icon" class="shrink-0 text-lg text-base-content/70" />
          <span class="flex-1 min-w-0 flex flex-col gap-0.5">
            <span class="text-sm font-medium">{{ t(`notification.section.${row.key}.title`) }}</span>
            <span class="text-xs text-base-content/60">{{ t(`notification.section.${row.key}.subtitle`) }}</span>
          </span>
          <input v-model="state[row.key]" type="checkbox" class="shrink-0 toggle toggle-sm" :disabled="state.loading" @change="save" />
        </label>
      </div>
    </Section>
  </Page>
</template>
