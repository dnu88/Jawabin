<script setup>
import { computed, onMounted, reactive } from 'vue'
import { Icon } from '@iconify/vue'
import Page from '../components/Page.vue'
import RowSkeleton from '../components/RowSkeleton.vue'
import { formatNumber, t } from '../i18n'
import { getDashboard } from '../api'
import { showToast } from '../toast'

const state = reactive({ loading: true, stats: null })

async function load() {
  state.loading = true
  try {
    state.stats = await getDashboard()
  } catch (error) {
    showToast(error.message, 'error')
  }
  state.loading = false
}

onMounted(load)

const percent = computed(() => `${Math.round((state.stats?.autoRate || 0) * 100)}%`)

const cards = computed(() => {
  const stats = state.stats || {}
  return [
    { key: 'today', icon: 'mingcute:chat-1-line', value: formatNumber(stats.commentsToday), hint: t('dashboard.card.todayHint') },
    { key: 'week', icon: 'mingcute:calendar-line', value: formatNumber(stats.commentsWeek), hint: t('dashboard.card.weekHint') },
    {
      key: 'pending',
      icon: 'mingcute:time-line',
      value: formatNumber(stats.pending),
      hint: t('dashboard.card.pendingHint'),
      attention: (stats.pending || 0) > 0,
      to: '/user/comment',
    },
    {
      key: 'auto',
      icon: 'mingcute:flash-line',
      value: percent.value,
      hint: t('dashboard.card.autoHint', { auto: formatNumber(stats.autoReplied), replied: formatNumber(stats.replied) }),
    },
    {
      key: 'tokens',
      icon: 'mingcute:ai-line',
      value: formatNumber(stats.tokensWeek),
      hint: t('dashboard.card.tokensHint', { total: formatNumber(stats.tokensTotal) }),
    },
    {
      key: 'accounts',
      icon: 'mingcute:classify-2-line',
      value: formatNumber(stats.accounts),
      hint: t('dashboard.card.accountsHint'),
      to: '/user/account',
    },
  ]
})
</script>

<template>
  <Page :title="t('dashboard.title')" :description="t('dashboard.hint')" back="">
    <div v-if="state.loading" class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <RowSkeleton v-for="n in 6" :key="n" />
    </div>

    <template v-else-if="state.stats">
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <component
          :is="card.to ? 'RouterLink' : 'div'"
          v-for="card in cards"
          :key="card.key"
          :to="card.to"
          class="w-full bg-base-100 rounded-bubble [--bubble-r:1rem] p-4 flex flex-col gap-1"
          :class="card.to ? 'hover:bg-base-200/60 transition-colors' : ''"
        >
          <div class="flex items-center gap-2 text-xs text-base-content/60">
            <Icon :icon="card.icon" class="text-base shrink-0" />
            <span class="truncate">{{ t(`dashboard.card.${card.key}`) }}</span>
          </div>
          <div class="flex items-baseline gap-2">
            <span class="text-2xl font-bold tabular-nums">{{ card.value }}</span>
            <span v-if="card.attention" class="badge badge-warning badge-sm">{{ t('dashboard.needsReply') }}</span>
          </div>
          <p class="text-xs text-base-content/60 leading-snug">{{ card.hint }}</p>
        </component>
      </div>

      <section
        v-if="!state.stats.accounts"
        class="w-full bg-base-100 rounded-md p-5 flex flex-col gap-2 sm:flex-row sm:items-center"
      >
        <div class="flex-1 min-w-0">
          <h2 class="text-sm font-semibold">{{ t('dashboard.empty.title') }}</h2>
          <p class="text-xs text-base-content/60">{{ t('dashboard.empty.message') }}</p>
        </div>
        <RouterLink to="/user/account" class="btn btn-sm btn-primary shrink-0">
          {{ t('account.connect') }}
        </RouterLink>
      </section>

      <p class="text-xs text-base-content/50">
        {{ t('dashboard.rangeNote', { days: state.stats.range.days }) }}
      </p>
    </template>

    <div v-else class="w-full bg-base-100 rounded-md p-5 text-sm text-base-content/60">
      {{ t('dashboard.loadFailed') }}
      <button class="btn btn-sm btn-ghost ml-2" @click="load">{{ t('dashboard.retry') }}</button>
    </div>
  </Page>
</template>
