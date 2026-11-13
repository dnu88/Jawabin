<script setup>
import { Icon } from '@iconify/vue'

defineProps({
  title: { type: String, default: '' },
  description: { type: String, default: '' },
  icon: { type: String, default: '' },
})
</script>

<template>
  <section class="w-full bg-base-100 rounded-md p-5 flex flex-col gap-4">
    <div v-if="title" class="w-full flex items-start gap-3">
      <span
        v-if="icon"
        class="shrink-0 size-9 rounded-bubble [--bubble-r:0.5rem] bg-base-200 flex justify-center items-center"
      >
        <Icon :icon="icon" class="text-base" />
      </span>
      <div class="flex-1 min-w-0 flex flex-col gap-0.5" :class="{ 'pt-0.5': icon }">
        <h2 class="text-sm font-semibold">{{ title }}</h2>
        <p v-if="description" class="text-xs text-base-content/60">{{ description }}</p>
      </div>
      <div v-if="$slots.action" class="shrink-0"><slot name="action" /></div>
    </div>
    <slot />
  </section>
</template>
