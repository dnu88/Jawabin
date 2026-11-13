import { createRouter, createWebHistory } from 'vue-router'
import { settingItems } from './menu'

const Placeholder = () => import('./pages/Placeholder.vue')

const settingChildren = settingItems.map((item) => ({
  path: item.path.replace('/user/setting/', ''),
  name: `user-setting-${item.key}`,
  component: item.key == 'ai' ? () => import('./pages/setting/AI.vue') : Placeholder,
  meta: { settingKey: item.key },
}))

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/user/setting/ai' },
    {
      path: '/user',
      name: 'user',
      component: () => import('./layouts/User.vue'),
      children: [
        { path: '', redirect: '/user/setting/ai' },
        {
          path: 'setting',
          name: 'user-setting',
          component: () => import('./pages/Setting.vue'),
          children: settingChildren,
        },
        { path: ':pathMatch(.*)*', name: 'user-placeholder', component: Placeholder },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/user/setting/ai' },
  ],
})
