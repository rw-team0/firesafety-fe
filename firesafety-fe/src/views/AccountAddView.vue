<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import httpRequester from '../utils/httpRequester'
import { useAuthStore } from '../stores/auth'
import { useUiAlertStore } from '../stores/uiAlert'

const router = useRouter()
const auth = useAuthStore()
const uiAlert = useUiAlertStore()
const form = ref({ name:'', email:'', phone:'', role:'GENERAL', siteIds:[] })
const errorMsg = ref('')
const sites = ref([])
const emailChecked = ref(false)
const emailAvailable = ref(null)

// 최고관리자만 "관리자(현장관리자)" 계정 생성 가능
const availableRoles = computed(() => auth.role === 'SUPER_ADMIN' ? ['ADMIN','GENERAL'] : ['GENERAL'])

onMounted(async () => {
  const res = await httpRequester.get('/sites') // API-009
  sites.value = res.data.resultData
})

function onEmailInput() {
  emailChecked.value = false
  emailAvailable.value = null
}

async function checkEmail() {
  // TODO: 이메일 중복확인 전용 API가 백엔드 명세에 없음. EMAIL_DUPLICATE(400)는
  // API-004(계정 등록) 제출 시점에만 내려오는 에러코드라, 지금은 제출 전 사전 확인이 불가능함.
  // 전용 API(예: GET /users/check-email?email=)가 추가되면 아래로 교체:
  // const res = await httpRequester.get('/users/check-email', { params: { email: form.value.email } })
  // emailAvailable.value = !res.data.resultData.duplicate
  uiAlert.show('이메일 중복확인 API가 아직 백엔드에 없습니다. 등록 시 중복이면 오류로 안내됩니다.')
}

async function submit() {
  errorMsg.value = ''
  try {
    await httpRequester.post('/users', form.value) // API-004
    router.push('/settings/accounts')
  } catch (e) {
    errorMsg.value = e.response?.data?.resultMessage === 'EMAIL_DUPLICATE'
      ? '이미 사용 중인 이메일입니다.' : '등록에 실패했습니다.'
  }
}
</script>

<template>
  <div>
    <h2 style="margin-top:0;">계정 추가</h2>
    <div class="card" style="max-width:420px;padding:24px;">
      <div v-if="errorMsg" class="banner banner-danger">{{ errorMsg }}</div>

      <label class="field-label">이름</label>
      <input v-model="form.name" placeholder="이름" class="field-input">

      <label class="field-label">이메일</label>
      <div style="display:flex;gap:8px;align-items:flex-start;">
        <input v-model="form.email" placeholder="이메일" class="field-input" style="flex:1;" @input="onEmailInput">
        <button class="btn" @click="checkEmail">중복확인</button>
      </div>
      <p v-if="emailChecked" style="font-size:12px;color:var(--color-text-muted);margin:-10px 0 16px;">{{ emailAvailable ? '사용 가능' : '이미 사용 중' }}</p>

      <label class="field-label">연락처</label>
      <input v-model="form.phone" placeholder="연락처" class="field-input">

      <label class="field-label">역할</label>
      <select v-model="form.role" class="field-input">
        <option v-for="r in availableRoles" :key="r" :value="r">{{ r==='ADMIN'?'관리자':'일반' }}</option>
      </select>

      <p class="field-label" style="margin-bottom:8px;">담당현장</p>
      <label v-for="s in sites" :key="s.siteId" style="display:block;font-size:14px;color:var(--color-text);margin-bottom:4px;">
        <input type="checkbox" v-model="form.siteIds" :value="s.siteId" />{{ s.name }}
      </label>

      <button class="btn btn-primary" style="margin-top:16px;" @click="submit">등록</button>
    </div>
  </div>
</template>
