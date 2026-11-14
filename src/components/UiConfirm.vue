<script setup>
import { onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { confirmState as state } from '../confirm'
import { t } from '../i18n'

async function accept() {
  state.loading = true
  try {
    await state.onConfirm?.()
  } finally {
    state.loading = false
    state.open = false
  }
}

function onKeydown(event) {
  if (event.key != 'Escape' || !state.open) return
  event.preventDefault()
  if (!state.loading) state.open = false
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div v-if="state.open" class="fixed inset-0 z-9998 flex sm:items-center items-end justify-center p-4" role="alertdialog" aria-modal="true">
    <div class="fixed inset-0 bg-black/30" @click="state.open = false" />
    <div class="relative w-full max-w-sm bg-base-100 border border-base-300 rounded-bubble [--bubble-r:1rem] p-5 flex flex-col gap-4 shadow-xl">
      <div class="flex items-start gap-3">
        <span class="shrink-0 size-9 rounded-bubble [--bubble-r:0.5rem] bg-error/10 text-error flex justify-center items-center">
          <Icon icon="mingcute:warning-line" />
        </span>
        <div class="flex-1 min-w-0 flex flex-col gap-0.5 pt-0.5">
          <h2 class="text-sm font-semibold">{{ state.title }}</h2>
          <p class="text-xs text-base-content/60">{{ state.message }}</p>
        </div>
      </div>
      <div class="flex justify-end gap-2">
        <button class="btn btn-sm btn-ghost" :disabled="state.loading" @click="state.open = false">{{ t('common.cancel') }}</button>
        <button class="btn btn-sm btn-error" :disabled="state.loading" @click="accept">
          <span v-if="state.loading" class="loading loading-xs" />
          {{ t('common.confirm') }}
        </button>
      </div>
    </div>
  </div>
</template>
