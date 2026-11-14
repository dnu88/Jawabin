const icons = {
  profile: 'mingcute:user-3-line',
  account: 'mingcute:classify-2-line',
  comment: 'mingcute:chat-1-line',
  contact: 'mingcute:contacts-3-line',
  addon: 'mingcute:add-circle-line',
  schedule: 'mingcute:calendar-time-add-line',
  chat: 'mingcute:chat-2-line',
  content: 'mingcute:pic-2-line',
  research: 'mingcute:search-line',
  report: 'mingcute:list-check-3-line',
  automation: 'mingcute:flash-line',
  listener: 'mingcute:refresh-2-line',
  template: 'mingcute:layout-3-line',
  storage: 'mingcute:folder-2-line',
}

export function scopeIcon(scope) {
  return icons[String(scope).split(':')[0]] || 'mingcute:key-2-line'
}
