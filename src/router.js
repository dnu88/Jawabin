import { createRouter, createWebHistory } from 'vue-router'
import { settingItems } from './menu'
import { authEnabled, authReady, session } from './auth'

const Placeholder = () => import('./pages/Placeholder.vue')

const settingPages = {
  profile: () => import('./pages/setting/Profile.vue'),
  session: () => import('./pages/setting/Session.vue'),
  activity: () => import('./pages/setting/Activity.vue'),
  twofactor: () => import('./pages/setting/TwoFactor.vue'),
  transaction: () => import('./pages/setting/Transaction.vue'),
  notification: () => import('./pages/setting/Notification.vue'),
  ai: () => import('./pages/setting/AI.vue'),
  api: () => import('./pages/setting/API.vue'),
  developer: () => import('./pages/setting/Developer.vue'),
  webhook: () => import('./pages/setting/Webhook.vue'),
  tikwm: () => import('./pages/setting/Tikwm.vue'),
  redeem: () => import('./pages/setting/Redeem.vue'),
  connected_app: () => import('./pages/setting/ConnectedApp.vue'),
}

const settingChildren = settingItems.map((item) => ({
  path: item.path.replace('/user/setting/', ''),
  name: `user-setting-${item.key}`,
  component: settingPages[item.key],
  meta: { settingKey: item.key },
}))

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/user/dashboard' },
    { path: '/login', name: 'login', component: () => import('./pages/Login.vue') },
    {
      path: '/user',
      name: 'user',
      component: () => import('./layouts/User.vue'),
      children: [
        { path: '', redirect: '/user/dashboard' },
        { path: 'dashboard', name: 'user-dashboard', component: () => import('./pages/Dashboard.vue') },
        {
          path: 'setting',
          name: 'user-setting',
          component: () => import('./pages/Setting.vue'),
          children: settingChildren,
        },
        { path: 'account', name: 'user-account', component: () => import('./pages/Account.vue') },
        { path: 'comment', name: 'user-comment', component: () => import('./pages/Comment.vue') },
        { path: 'conversation', name: 'user-conversation', component: () => import('./pages/Conversation.vue') },
        { path: 'automation', name: 'user-automation', component: () => import('./pages/Automation.vue') },
        { path: ':pathMatch(.*)*', name: 'user-placeholder', component: Placeholder },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/user/dashboard' },
  ],
})

// With Supabase configured, everything except /login needs a session.
router.beforeEach(async (to) => {
  if (!authEnabled) return to.name == 'login' ? '/user/dashboard' : true
  await authReady
  if (!session.value && to.name != 'login') return { name: 'login', query: { next: to.fullPath } }
  if (session.value && to.name == 'login') return '/user/dashboard'
  return true
})

export default router
