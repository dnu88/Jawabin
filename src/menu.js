// Sidebar and settings menu definitions.
export const sidebarGroups = [
  {
    key: 'main',
    items: [
      { key: 'dashboard', path: '/user/dashboard', icon: 'home-4' },
      { key: 'report', path: '/user/report', icon: 'list-check-3' },
    ],
  },
  {
    key: 'inbox',
    items: [
      { key: 'comment', path: '/user/comment', icon: 'chat-1' },
      { key: 'conversation', path: '/user/conversation', icon: 'chat-2' },
      { key: 'contact', path: '/user/contact', icon: 'contacts-3' },
      { key: 'assistant', path: '/user/assistant', icon: 'ai' },
    ],
  },
  {
    key: 'content',
    items: [
      { key: 'liveContent', path: '/user/content', icon: 'pic-2' },
      { key: 'schedule', path: '/user/schedule', icon: 'calendar-time-add' },
      { key: 'storage', path: '/user/storage', icon: 'folder-2' },
    ],
  },
  {
    key: 'automation',
    items: [
      { key: 'automation', path: '/user/automation', icon: 'flash' },
      { key: 'template', path: '/user/template', icon: 'layout-3' },
    ],
  },
  {
    key: 'account',
    items: [
      { key: 'account', path: '/user/account', icon: 'classify-2' },
      { key: 'operator', path: '/user/operator', icon: 'user-security' },
    ],
  },
  {
    key: 'research',
    items: [
      { key: 'contentTikTok', path: '/user/research/tiktok', icon: 'tiktok' },
      { key: 'contentThreads', path: '/user/research/threads', icon: 'threads' },
    ],
  },
]

export const sidebarExtras = [
  { key: 'affiliate', path: '/user/affiliate', icon: 'cash-2' },
  { key: 'setting', path: '/user/setting', icon: 'settings-3' },
]

export const settingItems = [
  { key: 'profile', group: 'account', path: '/user/setting/profile', icon: 'user-setting' },
  { key: 'session', group: 'account', path: '/user/setting/session', icon: 'sandglass-2' },
  { key: 'activity', group: 'account', path: '/user/setting/activity', icon: 'list-search' },
  { key: 'twofactor', group: 'account', path: '/user/setting/twofactor', icon: 'safe-lock' },
  { key: 'transaction', group: 'account', path: '/user/setting/transaction', icon: 'bank-card' },
  { key: 'notification', group: 'preference', path: '/user/setting/notification', icon: 'notification-newdot' },
  { key: 'ai', group: 'integration', path: '/user/setting/ai', icon: 'ai' },
  { key: 'api', group: 'integration', path: '/user/setting/api', icon: 'web' },
  { key: 'developer', group: 'integration', path: '/user/setting/developer', icon: 'code' },
  { key: 'webhook', group: 'integration', path: '/user/setting/webhook', icon: 'webhook' },
  { key: 'tikwm', group: 'integration', path: '/user/setting/tikwm', icon: 'key-2' },
  { key: 'redeem', group: 'account', path: '/user/setting/redeem', icon: 'coupon' },
  { key: 'connected_app', group: 'account', path: '/user/setting/connected-app', icon: 'plugin-2' },
]

// TODO: point these at the real Jawabin help resources.
export const helpLinks = [
  { key: 'tutorial', path: '#tutorial', icon: 'mingcute:book-5-line' },
  { key: 'documentation', path: '#docs', icon: 'mingcute:document-3-line' },
  { key: 'customerService', path: '#support', icon: 'mingcute:whatsapp-line' },
  { key: 'community', path: '#community', icon: 'mingcute:telegram-line' },
  { key: 'changelog', path: '#changelog', icon: 'mingcute:history-line' },
]

// Settings pages that still render mock data (PLAN.md step 4). While a real
// session is active they are hidden from the settings menu, so demo rows never
// look like the signed-in user's own data. Demo mode keeps showing all of them.
export const mockSettingKeys = [
  'session', 'activity', 'twofactor', 'transaction', 'notification',
  'api', 'developer', 'webhook', 'tikwm', 'redeem', 'connected_app',
]

export function visibleSettingItems(signedIn = false) {
  return signedIn ? settingItems.filter((item) => !mockSettingKeys.includes(item.key)) : settingItems
}
