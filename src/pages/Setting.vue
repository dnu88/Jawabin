<script setup>
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { t } from '../i18n'
import { settingItems, visibleSettingItems, helpLinks } from '../menu'
import { authEnabled } from '../auth'

const route = useRoute()
const router = useRouter()

const items = computed(() => visibleSettingItems(authEnabled))

const groups = computed(() =>
  ['account', 'preference', 'integration'].map((key) => ({
    key,
    items: items.value.filter((item) => item.group == key),
  })),
)

const isIndex = computed(() => route.name == 'user-setting')
const isActive = (path) => route.path.startsWith(path)

// On desktop the index has nothing to show, so open the first setting.
function openFirst() {
  if (!isIndex.value || !window.matchMedia('(min-width: 1024px)').matches) return
  const first = items.value[0] || settingItems[0]
  router.replace(first.path)
}

// Escape goes back to the menu, unless the user is typing or a dialog is open.
function onKeydown(event) {
  if (event.key != 'Escape' || event.defaultPrevented) return
  if (document.querySelector('dialog[open], [role="dialog"], [role="alertdialog"]')) return
  if (event.target?.closest?.('input, textarea, select, [contenteditable="true"]')) return
  router.push('/user/setting')
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  openFirst()
})
onUnmounted(() => document.removeEventListener('keydown', onKeydown))
watch(() => route.name, openFirst)
</script>

<template>
  <div class="w-full h-full min-w-0 flex">
    <nav
      class="shrink-0 lg:w-80 w-full h-full bg-base-100 flex flex-col gap-5 overflow-y-auto lg:border-r border-base-200 py-4"
      :class="{ 'lg:flex hidden': !isIndex }"
    >
      <div class="px-4 lg:hidden text-lg font-bold">{{ t('feature.menu.setting') }}</div>

      <div v-for="group in groups" :key="group.key" class="w-full flex flex-col gap-0.5 px-2">
        <div class="px-3 pb-1 text-xs font-medium text-base-content/50">{{ t(`setting.group.${group.key}`) }}</div>
        <RouterLink
          v-for="item in group.items"
          :key="item.key"
          :to="item.path"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-bubble [--bubble-r:0.625rem] transition-colors"
          :class="isActive(item.path) ? 'bg-base-200' : 'hover:bg-base-200/70'"
        >
          <Icon :icon="`mingcute:${item.icon}-${isActive(item.path) ? 'fill' : 'line'}`" class="shrink-0 text-lg" />
          <span class="flex-1 min-w-0 text-sm font-medium truncate">{{ t(`setting.menu.${item.key}`) }}</span>
          <Icon icon="mingcute:right-line" class="lg:hidden shrink-0 text-base-content/40" />
        </RouterLink>
      </div>

      <div class="w-full flex flex-col gap-0.5 px-2">
        <div class="px-3 pb-1 text-xs font-medium text-base-content/50">{{ t('setting.group.help') }}</div>
        <a
          v-for="link in helpLinks"
          :key="link.key"
          :href="link.path"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-bubble [--bubble-r:0.625rem] hover:bg-base-200/70 transition-colors"
        >
          <Icon class="shrink-0 text-lg" :icon="link.icon" />
          <span class="flex-1 min-w-0 text-sm font-medium">{{ t(`setting.link.${link.key}`) }}</span>
          <Icon class="shrink-0 text-xs text-base-content/50" icon="mingcute:external-link-line" />
        </a>
      </div>
    </nav>

    <div class="flex-1 relative min-w-0" :class="{ 'lg:block hidden': isIndex }">
      <div class="relative w-full min-w-0 h-full overflow-y-auto">
        <RouterView />
        <div v-if="isIndex" class="w-full h-full flex flex-col justify-center items-center gap-2 text-sm text-base-content/60">
          <Icon icon="mingcute:settings-3-line" class="text-2xl" />
          {{ t('setting.pick') }}
        </div>
      </div>
    </div>
  </div>
</template>
