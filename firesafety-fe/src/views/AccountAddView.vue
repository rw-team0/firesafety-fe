<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import httpRequester from '../utils/httpRequester'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
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
  alert('이메일 중복확인 API가 아직 백엔드에 없습니다. 등록 시 중복이면 오류로 안내됩니다.')
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
    <div v-if="errorMsg" class="banner-error">{{ errorMsg }}</div>
    <input v-model="form.name" placeholder="이름">
    <input v-model="form.email" placeholder="이메일" @input="onEmailInput">
    <button @click="checkEmail">중복확인</button>
    <span v-if="emailChecked">{{ emailAvailable ? '사용 가능' : '이미 사용 중' }}</span>
    <input v-model="form.phone" placeholder="연락처">
    <select v-model="form.role">
      <option v-for="r in availableRoles" :key="r" :value="r">{{ r==='ADMIN'?'관리자':'일반' }}</option>
    </select>

    <div>
      <p>담당현장</p>
      <label v-for="s in sites" :key="s.siteId" style="display:block;">
        <input type="checkbox" v-model="form.siteIds" :value="s.siteId" />{{ s.name }}
      </label>
    </div>

    <button @click="submit">등록</button>
  </div>
</template>
