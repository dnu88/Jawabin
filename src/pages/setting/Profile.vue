<script setup>
import { computed, reactive, ref } from 'vue'
import { Icon } from '@iconify/vue'
import Page from '../../components/Page.vue'
import Section from '../../components/Section.vue'
import UiModal from '../../components/UiModal.vue'
import { t, formatDay, formatNumber } from '../../i18n'
import { useRouter } from 'vue-router'
import { user, updateProfileName, PROFILE_NAME_LIMIT, sendPhoneCode, verifyPhoneCode, changePassword, deleteAccountData } from '../../api'
import { authEnabled, forgetSession } from '../../auth'
import { showToast } from '../../toast'

// A short list; extend with every country code when wiring the real backend.
const countries = [
  { name: 'Indonesia (+62)', value: '62' }, { name: 'Malaysia (+60)', value: '60' }, { name: 'Singapore (+65)', value: '65' },
  { name: 'Thailand (+66)', value: '66' }, { name: 'Philippines (+63)', value: '63' }, { name: 'Vietnam (+84)', value: '84' },
  { name: 'India (+91)', value: '91' }, { name: 'Australia (+61)', value: '61' }, { name: 'United Kingdom (+44)', value: '44' },
  { name: 'United States (+1)', value: '1' },
]

const nameDraft = ref(null)
const savingName = ref(false)
const nameError = ref('')
const displayName = computed({
  get: () => nameDraft.value ?? user.name,
  set: value => { nameDraft.value = value; nameError.value = '' },
})
async function saveName() {
  if (savingName.value) return
  const name = displayName.value.trim()
  if (!name || name.length > PROFILE_NAME_LIMIT) {
    nameError.value = t('displayName.invalid')
    return
  }
  savingName.value = true
  try {
    await updateProfileName(name)
    nameDraft.value = null
    showToast(t('displayName.saved'), 'success')
  } catch (error) {
    nameError.value = error.message
  } finally {
    savingName.value = false
  }
}

const showVerify = ref(false)
const verify = reactive({ loading: false, step: 'phone', country: '62', phone: '', code: '', error: '' })

function openVerify() {
  Object.assign(verify, { loading: false, step: 'phone', country: '62', phone: '', code: '', error: '' })
  showVerify.value = true
}
async function submitVerify() {
  if (verify.loading) return
  const field = verify.step == 'phone' ? 'phone' : 'code'
  verify.error = !verify[field] ? t(`profile.verify.form.${field}.validation.required`)
    : !/^\d+$/.test(verify[field]) ? t(`profile.verify.form.${field}.validation.numeric`)
    : field == 'code' && verify.code.length != 6 ? t('profile.verify.form.code.validation.length') : ''
  if (verify.error) return
  verify.loading = true
  try {
    if (verify.step == 'phone') {
      await sendPhoneCode(`${verify.country}${verify.phone.replace(/^0/, '')}`)
      verify.step = 'code'
    } else {
      await verifyPhoneCode(verify.code)
      showVerify.value = false
      showToast(t('profile.verify.toast.verify'), 'success')
    }
  } catch (error) {
    showToast(error.message, 'error')
  }
  verify.loading = false
}

const showPassword = ref(false)
const password = reactive({ loading: false, show: false, value: '', error: '' })

function openPassword() {
  Object.assign(password, { loading: false, show: false, value: '', error: '' })
  showPassword.value = true
}
async function submitPassword() {
  password.error = password.value ? '' : t('profile.password.form.password.validation.required')
  if (password.error || password.loading) return
  password.loading = true
  try {
    await changePassword(password.value)
    showPassword.value = false
    showToast(t('profile.password.toast'), 'success')
  } catch (error) {
    showToast(error.message, 'error')
  }
  password.loading = false
}

const router = useRouter()
const showDelete = ref(false)
const removal = reactive({ loading: false, value: '', error: '' })

function openDelete() {
  Object.assign(removal, { loading: false, value: '', error: '' })
  showDelete.value = true
}
async function submitDelete() {
  if (removal.loading) return
  removal.error = removal.value.trim().toLowerCase() == String(user.email).toLowerCase() ? '' : t('danger.mismatch')
  if (removal.error) return
  removal.loading = true
  try {
    await deleteAccountData(removal.value.trim())
    await forgetSession()
    showToast(t('danger.toast'), 'success')
    router.replace('/')
  } catch (error) {
    removal.error = error.message
    removal.loading = false
  }
}

const hasPlan = computed(() => user.plan && user.plan != 'free' && user.expiredAt)
const daysLeft = computed(() => (hasPlan.value ? Math.max(0, Math.ceil((new Date(user.expiredAt) - Date.now()) / 86400000)) : 0))
const addonRows = computed(() => [
  { key: 'account', value: formatNumber(user.addon?.account) },
  { key: 'operator', value: formatNumber(user.addon?.operator) },
  { key: 'storage', value: `${formatNumber(user.addon?.storage)} GB` },
  { key: 'twitter', value: `${formatNumber(user.addon?.twitter)} ${t('profile.twitter.post')}` },
  { key: 'reset', value: user.expiredAt ? formatDay(user.expiredAt) : '-' },
])
</script>

<template>
  <Page :title="t('profile.title')" :description="t('setting.hint.profile')">
    <Section>
      <div class="w-full flex items-center gap-4">
        <span class="shrink-0 size-14 rounded-bubble [--bubble-r:0.875rem] bg-primary text-primary-content flex justify-center items-center text-xl font-semibold uppercase">
          {{ user.name?.[0] }}
        </span>
        <div class="flex-1 min-w-0">
          <div class="text-base font-semibold line-clamp-1 break-all">{{ user.name }}</div>
          <div class="text-sm text-base-content/70 line-clamp-1 break-all">{{ user.email }}</div>
          <div class="text-xs text-base-content/50 mt-0.5">{{ t('profile.emailHint') }}</div>
        </div>
      </div>
      <form class="w-full flex flex-col items-start gap-2" @submit.prevent="saveName">
        <label for="profile-name" class="text-sm font-medium">{{ t('displayName.label') }}</label>
        <input id="profile-name" v-model="displayName" class="input w-full" autocomplete="name" :maxlength="PROFILE_NAME_LIMIT" :disabled="savingName" />
        <span v-if="nameError" class="text-xs text-error" role="alert">{{ nameError }}</span>
        <button class="btn btn-sm btn-primary" :disabled="savingName || displayName === user.name">{{ t('displayName.save') }}</button>
      </form>
    </Section>

    <Section icon="mingcute:phone-line" :title="t('profile.section.phoneNumber')" :description="user.phone ? '' : t('profile.section.alert')">
      <template #action>
        <span v-if="user.phone" class="flex items-center gap-1 text-xs font-medium">
          <Icon icon="mingcute:check-circle-fill" class="text-base" />
          {{ t('profile.phone.verified') }}
        </span>
        <button v-else class="btn btn-sm btn-primary" @click="openVerify">{{ t('profile.phone.verify') }}</button>
      </template>
      <div class="text-sm tabular-nums" :class="{ 'text-base-content/50': !user.phone }">
        {{ user.phone ? `+${user.phone}` : t('profile.phone.none') }}
      </div>
    </Section>

    <Section icon="mingcute:lock-line" :title="t('profile.section.password')" :description="t('profile.passwordHint')">
      <template #action>
        <button class="btn btn-sm" @click="openPassword">{{ t('profile.change') }}</button>
      </template>
    </Section>

    <Section icon="mingcute:safe-flash-line" :title="t('profile.section.plan')">
      <template #action>
        <RouterLink to="/user/upgrade" class="btn btn-sm" :class="{ 'btn-primary': !hasPlan }">
          {{ hasPlan ? t('profile.plan.extend') : t('profile.plan.upgrade') }}
        </RouterLink>
      </template>
      <div class="flex flex-col gap-0.5">
        <div class="text-base font-semibold capitalize">{{ hasPlan ? user.plan : t('profile.plan.free') }}</div>
        <div v-if="hasPlan" class="text-sm text-base-content/70">
          <template v-if="daysLeft">
            {{ t('profile.plan.until', { date: formatDay(user.expiredAt) }) }} ·
            <span :class="{ 'text-error font-medium': daysLeft <= 7 }">{{ t('profile.plan.left', { count: daysLeft }, daysLeft) }}</span>
          </template>
          <span v-else class="text-error">{{ t('profile.plan.expired', { date: formatDay(user.expiredAt) }) }}</span>
        </div>
      </div>
    </Section>

    <Section icon="mingcute:add-circle-line" :title="t('profile.addonTitle')">
      <dl class="w-full flex flex-col">
        <div v-for="row in addonRows" :key="row.key" class="w-full flex items-center justify-between gap-3 py-2.5 border-b border-base-200 last:border-b-0 text-sm">
          <dt class="text-base-content/70">{{ t(`profile.addonRows.${row.key}`) }}</dt>
          <dd class="font-medium tabular-nums">{{ row.value }}</dd>
        </div>
      </dl>
      <ul class="w-full flex flex-col gap-1.5 text-xs text-base-content/60">
        <li v-for="key in ['addon', 'storage']" :key="key" class="flex items-start gap-1.5">
          <Icon icon="mingcute:information-line" class="shrink-0 mt-px" />
          {{ t(`profile.${key}.information`) }}
        </li>
      </ul>
    </Section>
    <Section v-if="authEnabled" icon="mingcute:delete-2-line" :title="t('danger.title')" :description="t('danger.hint')">
      <div class="w-full flex justify-end border-t border-base-200 pt-4">
        <button class="btn btn-sm text-error" @click="openDelete">{{ t('danger.button') }}</button>
      </div>
    </Section>
  </Page>

  <UiModal v-model="showDelete" :title="t('danger.modal')">
    <form class="w-full flex flex-col gap-5" @submit.prevent="submitDelete">
      <p class="text-sm text-base-content/70">{{ t('danger.hint') }}</p>
      <div class="flex flex-col gap-1">
        <label for="delete-confirm" class="text-xs text-base-content/70">{{ t('danger.label', { email: user.email }) }}</label>
        <input id="delete-confirm" v-model="removal.value" type="email" class="w-full input" :class="{ 'input-error': removal.error }" autocomplete="off" />
        <span v-if="removal.error" class="text-xs text-error" role="alert">{{ removal.error }}</span>
      </div>
      <div class="w-full flex items-center gap-3">
        <button type="button" class="btn flex-1" :disabled="removal.loading" @click="showDelete = false">{{ t('danger.cancel') }}</button>
        <button type="submit" class="btn btn-error flex-1" :disabled="removal.loading">
          <span v-if="removal.loading" class="loading loading-xs" />
          {{ t('danger.confirm') }}
        </button>
      </div>
    </form>
  </UiModal>

  <UiModal v-model="showVerify" :title="t('profile.verify.title')">
    <form class="w-full flex flex-col gap-5" @submit.prevent="submitVerify">
      <div class="w-full flex items-center gap-2 text-xs">
        <span v-for="(step, index) in ['phone', 'code']" :key="step" class="flex items-center gap-1.5" :class="verify.step == step ? 'font-medium' : 'text-base-content/50'">
          <span
            class="size-5 rounded-bubble [--bubble-r:0.35rem] flex justify-center items-center tabular-nums"
            :class="verify.step == step ? 'bg-primary text-primary-content' : 'bg-base-200'"
          >
            {{ index + 1 }}
          </span>
          {{ t(`profile.verify.form.${step}.label`) }}
          <Icon v-if="index == 0" icon="mingcute:right-line" class="text-base-content/30" />
        </span>
      </div>
      <div class="w-full grid grid-cols-[minmax(0,9rem)_1fr] gap-2">
        <div class="flex flex-col gap-1">
          <label for="verify-country" class="text-xs text-base-content/70">{{ t('profile.verify.form.country.label') }}</label>
          <select id="verify-country" v-model="verify.country" class="select w-full" :disabled="verify.step != 'phone'">
            <option v-for="country in countries" :key="country.name" :value="country.value">{{ country.name }}</option>
          </select>
        </div>
        <div class="flex flex-col gap-1">
          <label for="verify-phone" class="text-xs text-base-content/70">{{ t('profile.verify.form.phone.label') }}</label>
          <input
            id="verify-phone"
            v-model.trim="verify.phone"
            type="text"
            inputmode="numeric"
            class="input w-full tabular-nums"
            :disabled="verify.step != 'phone'"
            :placeholder="t('profile.verify.form.phone.placeholder')"
          />
        </div>
      </div>
      <div v-if="verify.step == 'code'" class="flex flex-col gap-1">
        <label for="verify-code" class="text-xs text-base-content/70">{{ t('profile.verify.form.code.label') }}</label>
        <input
          id="verify-code"
          v-model.trim="verify.code"
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="6"
          class="input w-full text-center text-lg tracking-[0.5em] tabular-nums"
          :placeholder="t('profile.verify.form.code.placeholder')"
        />
      </div>
      <span v-if="verify.error" class="-mt-3 text-xs text-error">{{ verify.error }}</span>
      <div class="w-full flex items-center gap-3">
        <button type="button" class="btn flex-1" :disabled="verify.loading" @click="showVerify = false">{{ t('profile.verify.button.cancel') }}</button>
        <button type="submit" class="btn btn-primary flex-1" :disabled="verify.loading">
          <span v-if="verify.loading" class="loading loading-xs" />
          {{ t(`profile.verify.button.${verify.step == 'phone' ? 'send' : 'verify'}`) }}
        </button>
      </div>
    </form>
  </UiModal>

  <UiModal v-model="showPassword" :title="t('profile.password.title')">
    <form class="w-full flex flex-col gap-5" @submit.prevent="submitPassword">
      <div class="flex flex-col gap-1">
        <label for="new-password" class="text-xs text-base-content/70">{{ t('profile.password.form.password.label') }}</label>
        <label class="w-full input" :class="{ 'input-error': password.error }">
          <input
            id="new-password"
            v-model="password.value"
            :type="password.show ? 'text' : 'password'"
            :placeholder="t('profile.password.form.password.placeholder')"
            class="w-full"
            autocomplete="new-password"
          />
          <button
            type="button"
            class="cursor-pointer text-base-content/60 hover:text-base-content"
            :aria-label="t('profile.password.form.password.label')"
            @click="password.show = !password.show"
          >
            <Icon :icon="password.show ? 'mingcute:eye-2-line' : 'mingcute:eye-close-line'" />
          </button>
        </label>
        <span v-if="password.error" class="text-xs text-error">{{ password.error }}</span>
      </div>
      <div class="w-full flex items-center gap-3">
        <button type="button" class="btn flex-1" :disabled="password.loading" @click="showPassword = false">{{ t('profile.password.button.cancel') }}</button>
        <button type="submit" class="btn btn-primary flex-1" :disabled="password.loading">
          <span v-if="password.loading" class="loading loading-xs" />
          {{ t('profile.password.button.save') }}
        </button>
      </div>
    </form>
  </UiModal>
</template>
