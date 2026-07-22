<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import httpRequester from '../utils/httpRequester'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const form = ref({ name:'', email:'', phone:'', role:'GENERAL', siteIds:[] })
const errorMsg = ref('')

// 최고관리자만 "관리자(현장관리자)" 계정 생성 가능
const availableRoles = computed(() => auth.role === 'SUPER_ADMIN' ? ['ADMIN','GENERAL'] : ['GENERAL'])

async function submit() {
  errorMsg.value = ''
  try {
    await apiClient.post('/users', form.value) // API-004
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
    <input v-model="form.email" placeholder="이메일">
    <input v-model="form.phone" placeholder="연락처">
    <select v-model="form.role">
      <option v-for="r in availableRoles" :key="r" :value="r">{{ r==='ADMIN'?'관리자':'일반' }}</option>
    </select>
    <button @click="submit">등록</button>
  </div>
</template>