<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { Icon } from '@iconify/vue'
import { t, locale, setLocale } from '../i18n'
import { user } from '../api'
import { sidebarGroups, sidebarExtras } from '../menu'

const route = useRoute()

function stored(key) {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function store(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {}
}

const collapsed = ref(stored('sidebar') == 'collapsed')
function toggleCollapsed() {
  collapsed.value = !collapsed.value
  store('sidebar', collapsed.value ? 'collapsed' : 'expanded')
}

const dark = ref(
  (stored('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')) == 'dark',
)
function applyTheme() {
  document.documentElement.dataset.theme = dark.value ? 'dark' : 'light'
}
function toggleTheme() {
  dark.value = !dark.value
  store('theme', dark.value ? 'dark' : 'light')
  applyTheme()
}
applyTheme()
document.documentElement.lang = locale.value

const isActive = (path) => route.path == path || route.path.startsWith(`${path}/`)
const icon = (name, active) => `mingcute:${name}-${active ? 'fill' : 'line'}`
const itemClass = (path) =>
  isActive(path) ? 'bg-base-200 text-base-content font-medium' : 'text-base-content/70 hover:bg-base-200/60 hover:text-base-content'

const tabs = [
  { key: 'dashboard', path: '/user/dashboard', icon: 'home-4' },
  { key: 'comment', path: '/user/comment', icon: 'chat-1' },
  { key: 'conversation', path: '/user/conversation', icon: 'chat-2' },
  { key: 'automation', path: '/user/automation', icon: 'flash' },
  { key: 'setting', path: '/user/setting', icon: 'settings-3' },
]
</script>

<template>
  <div class="w-full h-dvh">
    <div class="w-full h-full flex lg:flex-row flex-col justify-between">
      <aside
        class="lg:flex hidden shrink-0 h-full flex-col border-e border-base-300 bg-base-100 transition-[width] duration-200 ease-out"
        :class="collapsed ? 'w-16' : 'w-64'"
      >
        <div class="h-14 shrink-0 flex items-center" :class="collapsed ? 'justify-center' : 'justify-between pl-5 pr-3'">
          <RouterLink to="/user/dashboard" class="flex items-center gap-2" :aria-label="collapsed ? 'Jawabin' : undefined">
            <span class="size-6 shrink-0 rounded-bubble [--bubble-r:0.5rem] bg-base-content text-base-100 flex items-center justify-center text-xs font-bold">J</span>
            <span v-if="!collapsed" class="font-semibold tracking-tight">Jawabin</span>
          </RouterLink>
          <button
            v-if="!collapsed"
            class="btn btn-ghost btn-sm btn-square text-base-content/60"
            :aria-label="t('feature.sidebar.collapse')"
            :title="t('feature.sidebar.collapse')"
            @click="toggleCollapsed"
          >
            <Icon icon="mingcute:layout-leftbar-close-line" class="text-lg" />
          </button>
        </div>
        <button
          v-if="collapsed"
          class="mx-auto mb-2 flex size-10 items-center justify-center rounded-bubble [--bubble-r:0.5rem] text-base-content/60 hover:bg-base-200 hover:text-base-content cursor-pointer"
          :aria-label="t('feature.sidebar.expand')"
          :title="t('feature.sidebar.expand')"
          @click="toggleCollapsed"
        >
          <Icon icon="mingcute:layout-leftbar-open-line" class="text-lg" />
        </button>

        <nav class="nav flex-1 overflow-y-auto overflow-x-hidden px-3 pb-6 flex flex-col gap-4">
          <div v-for="group in sidebarGroups" :key="group.key" class="flex flex-col gap-0.5">
            <template v-if="group.key != 'main'">
              <span v-if="collapsed" class="mx-auto mb-1.5 h-px w-5 bg-base-300" />
              <p v-else class="px-3 pb-1 text-xs text-base-content/45">{{ t(`feature.title.${group.key}`) }}</p>
            </template>
            <RouterLink
              v-for="item in group.items"
              :key="item.key"
              :to="item.path"
              class="nav-item relative"
              :class="[collapsed ? 'is-collapsed' : '', itemClass(item.path)]"
              :title="collapsed ? t(`feature.menu.${item.key}`) : undefined"
              :aria-label="collapsed ? t(`feature.menu.${item.key}`) : undefined"
            >
              <Icon :icon="icon(item.icon, isActive(item.path))" class="text-lg shrink-0" />
              <span v-if="!collapsed" class="truncate">{{ t(`feature.menu.${item.key}`) }}</span>
            </RouterLink>
          </div>
        </nav>

        <div class="shrink-0 border-t border-base-300 p-3 flex flex-col gap-2.5">
          <div class="flex flex-col gap-0.5">
            <RouterLink
              v-for="item in sidebarExtras"
              :key="item.key"
              :to="item.path"
              class="nav-item"
              :class="[collapsed ? 'is-collapsed' : '', itemClass(item.path)]"
              :title="collapsed ? t(`feature.menu.${item.key}`) : undefined"
              :aria-label="collapsed ? t(`feature.menu.${item.key}`) : undefined"
            >
              <Icon :icon="icon(item.icon, isActive(item.path))" class="text-lg shrink-0" />
              <span v-if="!collapsed" class="truncate">{{ t(`feature.menu.${item.key}`) }}</span>
            </RouterLink>
          </div>

          <div class="dropdown dropdown-top w-full" :class="{ 'mx-auto w-auto': collapsed }">
            <div tabindex="0" role="button" class="flex items-center gap-2.5 rounded-bubble [--bubble-r:0.5rem] p-1.5 hover:bg-base-200 cursor-pointer">
              <span class="size-8 rounded-full shrink-0 bg-base-200 flex items-center justify-center text-sm font-semibold">
                {{ user.name.charAt(0) }}
              </span>
              <template v-if="!collapsed">
                <div class="min-w-0 flex-1">
                  <div class="text-sm font-medium truncate">{{ user.name }}</div>
                  <div class="text-xs text-base-content/55 truncate">{{ user.email }}</div>
                </div>
                <Icon icon="mingcute:selector-vertical-line" class="shrink-0 text-base-content/50" />
              </template>
            </div>
            <div tabindex="0" class="dropdown-content z-50 w-64 rounded-bubble [--bubble-r:0.75rem] border border-base-300 bg-base-100 p-2 shadow-lg mb-1">
              <div class="flex items-center justify-between gap-3 px-2.5 py-2 text-sm">
                <span class="flex items-center gap-2.5 text-base-content/80">
                  <Icon icon="mingcute:translate-2-line" class="text-base" />
                  {{ t('feature.sidebar.language') }}
                </span>
                <div class="flex p-0.5 bg-base-200 rounded-bubble [--bubble-r:0.4rem]">
                  <button
                    v-for="code in ['en', 'id']"
                    :key="code"
                    class="px-2 py-0.5 text-xs font-medium uppercase rounded-bubble [--bubble-r:0.3rem] cursor-pointer"
                    :class="locale == code ? 'bg-base-100 shadow-sm' : 'text-base-content/60'"
                    @click="setLocale(code)"
                  >
                    {{ code }}
                  </button>
                </div>
              </div>
              <label class="flex items-center justify-between gap-3 px-2.5 py-2 text-sm cursor-pointer">
                <span class="flex items-center gap-2.5 text-base-content/80">
                  <Icon icon="mingcute:moon-line" class="text-base" />
                  {{ t('feature.sidebar.theme') }}
                </span>
                <input type="checkbox" class="toggle toggle-sm" :checked="dark" @change="toggleTheme" />
              </label>
            </div>
          </div>
        </div>
      </aside>

      <main class="w-full h-full overflow-y-auto bg-base-200/80 min-h-0">
        <RouterView />
      </main>

      <nav class="w-full lg:hidden shrink-0 border-t border-base-300 bg-base-100 pb-[env(safe-area-inset-bottom)]">
        <div class="grid grid-cols-5">
          <RouterLink v-for="tab in tabs" :key="tab.key" :to="tab.path" class="tab-item" :class="{ 'is-active': isActive(tab.path) }">
            <span class="tab-icon"><Icon :icon="icon(tab.icon, isActive(tab.path))" class="text-xl" /></span>
            <span class="tab-label truncate max-w-full px-1">{{ t(`feature.menu.${tab.key}`) }}</span>
          </RouterLink>
        </div>
      </nav>
    </div>
  </div>
</template>

<style scoped>
.nav {
  mask-image: linear-gradient(to bottom, black calc(100% - 1.5rem), transparent);
}
.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  height: 2.125rem;
  padding: 0 0.75rem;
  font-size: 0.875rem;
  border-radius: 0.5rem 0.5rem 0.5rem 0.0833rem;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.nav-item.is-collapsed {
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  margin: 0 auto;
  padding: 0;
}
.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem 0 0.625rem;
  color: color-mix(in oklab, var(--color-base-content) 60%, transparent);
}
.tab-item.is-active {
  color: var(--color-base-content);
}
.tab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3.25rem;
  height: 1.875rem;
  border-radius: 0.625rem 0.625rem 0.625rem 0.125rem;
  transition: background-color 0.2s ease;
}
.tab-item.is-active .tab-icon {
  background: var(--color-base-200);
}
.tab-label {
  font-size: 0.6875rem;
  line-height: 1;
  font-weight: 500;
}
</style>
