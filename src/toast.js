import { reactive } from 'vue'

export const toasts = reactive([])
let id = 0

export function showToast(message, type = 'success') {
  const toast = { id: ++id, message, type }
  toasts.push(toast)
  setTimeout(() => {
    const index = toasts.indexOf(toast)
    if (index >= 0) toasts.splice(index, 1)
  }, 3000)
}
