<script setup>
import { toasts } from '../toast'
</script>

<template>
  <div class="toast toast-top toast-center z-9999" role="status" aria-live="polite">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="alert text-sm py-2.5"
      :class="toast.type == 'error' ? 'alert-error' : 'bg-base-content text-base-100 border-0'"
    >
      {{ toast.message }}
    </div>
  </div>
</template>
