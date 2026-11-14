<script setup>
import { onMounted, onUnmounted } from 'vue'
import { Icon } from '@iconify/vue'
import { t } from '../i18n'

const props = defineProps({ modelValue: { type: Boolean, default: false }, title: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue', 'close'])

function close() {
  emit('update:modelValue', false)
  emit('close')
}

function onKeydown(event) {
  if (event.key != 'Escape' || !props.modelValue) return
  event.preventDefault()
  close()
}
onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div v-if="modelValue" class="fixed inset-0 z-9990 flex sm:items-center items-end justify-center sm:p-4" role="dialog" aria-modal="true">
    <div class="fixed inset-0 bg-black/30" @click="close" />
    <div class="relative w-full sm:max-w-md max-h-[90dvh] overflow-y-auto bg-base-100 sm:rounded-lg rounded-t-2xl p-6">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold">{{ title }}</h3>
        <button class="btn btn-sm btn-circle btn-ghost" :aria-label="t('common.close')" @click="close">
          <Icon icon="mingcute:close-line" />
        </button>
      </div>
      <slot />
    </div>
  </div>
</template>
