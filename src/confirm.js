import { reactive } from 'vue'

export const confirmState = reactive({ open: false, title: '', message: '', loading: false, onConfirm: null })

export function confirm({ title, message, onConfirm }) {
  Object.assign(confirmState, { open: true, title, message, onConfirm, loading: false })
}
