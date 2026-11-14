import { showToast } from './toast'

export async function copyText(text, message) {
  try {
    await navigator.clipboard.writeText(text)
    showToast(message, 'success')
  } catch {
    showToast('Clipboard is not available', 'error')
  }
}
