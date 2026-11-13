<script setup>
import { ref } from 'vue'
import Page from '../../components/Page.vue'
import Form from './ai/Form.vue'
import Summary from './ai/Summary.vue'
import History from './ai/History.vue'
import { t } from '../../i18n'

// Bumped on save so the summary and history reload with the new test request.
const version = ref(0)
</script>

<template>
  <Page :title="t('ai.title')" :description="t('setting.hint.ai')">
    <Form @save="version++" />
    <Summary :key="`summary-${version}`" />
    <History :key="`history-${version}`" />
  </Page>
</template>
