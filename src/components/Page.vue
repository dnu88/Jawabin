<script setup>
import { Icon } from '@iconify/vue'
import { t } from '../i18n'

defineProps({ title: { type: String, default: '' }, description: { type: String, default: '' } })
</script>

<template>
  <div class="w-full lg:p-8 p-4">
    <div class="w-full max-w-3xl mx-auto flex flex-col gap-5">
      <div class="w-full flex items-start gap-2">
        <RouterLink
          to="/user/setting"
          class="lg:hidden btn btn-sm btn-square btn-ghost -ml-1.5 mt-0.5 shrink-0"
          :aria-label="t('setting.back')"
        >
          <Icon icon="mingcute:left-line" class="text-lg" />
        </RouterLink>
        <div class="flex-1 min-w-0 flex flex-col gap-0.5">
          <h1 class="text-xl font-bold">{{ title }}</h1>
          <p v-if="description" class="text-sm text-base-content/60">{{ description }}</p>
        </div>
        <div v-if="$slots.action" class="shrink-0"><slot name="action" /></div>
      </div>
      <slot />
    </div>
  </div>
</template>
