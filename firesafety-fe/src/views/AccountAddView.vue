<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import httpRequester from '../utils/httpRequester'
import { useAuthStore } from '../stores/auth'
import { useUiAlertStore } from '../stores/uiAlert'

const router = useRouter()
const auth = useAuthStore()
const uiAlert = useUiAlertStore()
const form = ref({ name:'', email:'', password:'', phone:'', role:'GENERAL', siteIds:[] })
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
  if (!form.value.email) {
    uiAlert.show('이메일을 입력해주세요.')
    return
  }
  const res = await httpRequester.get('/users/check-email', { params: { email: form.value.email } })
  emailAvailable.value = !res.data.resultData.duplicate
  emailChecked.value = true
}

async function submit() {
  errorMsg.value = ''
  try {
    // Swagger 확인(UserCreateReq): email/password/name/phone/role 필수·선택 필드 — password는 예전엔 입력칸 자체가
    // 없어서 실제로는 등록이 안 됐음. siteIds는 UserCreateReq에 없는 필드라 여기 보내도 무시되므로
    // 계정 생성 성공 후 담당현장배정 API(POST /users/{id}/site-assignments)로 별도 저장
    const { siteIds, ...body } = form.value
    const res = await httpRequester.post('/users', body) // Swagger 확인: POST /api/users
    if (siteIds.length) {
      await httpRequester.post(`/users/${res.data.resultData.userId}/site-assignments`, { siteIds })
    }
    router.push('/settings/accounts')
  } catch (e) {
    errorMsg.value = e.response?.data?.resultMessage === 'EMAIL_DUPLICATE'
      ? '이미 사용 중인 이메일입니다.' : '등록에 실패했습니다.'
  }
}

function cancel() {
  router.push('/settings/accounts')
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

      <label class="field-label">초기 비밀번호</label>
      <input v-model="form.password" type="password" placeholder="영문+숫자 8자 이상" class="field-input" autocomplete="new-password">

      <label class="field-label">연락처</label>
      <input v-model="form.phone" placeholder="연락처" class="field-input">

      <label class="field-label">역할</label>
      <select v-model="form.role" class="field-input">
        <option v-for="r in availableRoles" :key="r" :value="r">{{ r==='ADMIN'?'관리자':'일반' }}</option>
      </select>

      <label class="field-label">담당현장 (Ctrl/Cmd+클릭으로 다중 선택)</label>
      <select v-model="form.siteIds" multiple class="field-input" style="height:120px;">
        <option v-for="s in sites" :key="s.siteId" :value="s.siteId">{{ s.name }}</option>
      </select>

      <div style="display:flex;gap:8px;margin-top:16px;">
        <button class="btn btn-primary" @click="submit">등록</button>
        <button class="btn" @click="cancel">취소</button>
      </div>
    </div>
  </div>
</template>
