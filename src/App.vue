<script setup>
import UiToast from './components/UiToast.vue'
import UiConfirm from './components/UiConfirm.vue'
</script>

<template>
  <RouterView />
  <UiConfirm />
  <UiToast />
</template>
