<script setup>
import { computed } from 'vue'
import { Icon } from '@iconify/vue'

const page = defineModel({ type: Number })
const props = defineProps({ total: { type: Number, default: 1 } })

// A sliding window of up to three page numbers around the current one.
const pages = computed(() => {
  let start = Math.max(1, page.value - 1)
  let end = start + 2
  if (end > props.total) {
    end = props.total
    start = Math.max(1, end - 2)
  }
  const list = []
  for (let i = start; i <= end; i++) list.push(i)
  return list
})
</script>

<template>
  <div class="flex justify-center gap-1.5 text-xs font-medium">
    <button class="btn btn-sm" :class="{ 'cursor-not-allowed': page == 1 }" :disabled="page == 1" aria-label="Previous" @click="page--">
      <Icon icon="mingcute:left-fill" />
    </button>
    <button v-for="n in pages" :key="n" class="btn btn-sm" :class="{ 'btn-primary': page == n }" @click="page = n">
      {{ n }}
    </button>
    <button class="btn btn-sm" :class="{ 'cursor-not-allowed': page == total }" :disabled="page == total" aria-label="Next" @click="page++">
      <Icon icon="mingcute:right-fill" />
    </button>
  </div>
</template>
