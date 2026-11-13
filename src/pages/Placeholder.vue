<script setup>
import { Icon } from '@iconify/vue'
import { t } from '../i18n'
</script>

<template>
  <div class="w-full h-full min-h-60 flex flex-col justify-center items-center gap-2 p-4 text-sm text-base-content/60">
    <Icon icon="mingcute:tool-line" class="text-2xl" />
    {{ t('feature.soon') }}
    <RouterLink to="/user/setting" class="lg:hidden btn btn-sm mt-2">{{ t('setting.back') }}</RouterLink>
  </div>
</template>
