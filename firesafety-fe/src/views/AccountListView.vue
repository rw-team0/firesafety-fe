<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import apiClient from '../api/client'

const router = useRouter()
const users = ref([])
const loading = ref(true)
const errorMsg = ref('')
const ROLE_LABEL = { SUPER_ADMIN:'최고관리자', ADMIN:'관리자', GENERAL:'일반' }

async function loadUsers() {
  loading.value = true; errorMsg.value = ''
  try {
    const res = await apiClient.get('/api/users') // API-003
    users.value = res.data.resultData
  } catch (e) {
    errorMsg.value = '계정 목록을 불러오지 못했습니다.'
  } finally {
    loading.value = false
  }
}
onMounted(loadUsers)
</script>

<template>
  <div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:16px;">
      <button @click="router.push('/settings/accounts/new')">+ 계정 추가</button>
    </div>
    <p v-if="loading">불러오는 중...</p>
    <p v-else-if="errorMsg">{{ errorMsg }}</p>
    <table v-else>
      <thead><tr><th>이름</th><th>이메일</th><th>연락처</th><th>역할</th><th>담당현장</th><th>최근로그인</th><th></th></tr></thead>
      <tbody>
        <tr v-for="u in users" :key="u.userId" style="cursor:pointer;" @click="router.push(`/settings/accounts/${u.userId}`)">
          <td>{{ u.name }}</td><td>{{ u.email }}</td><td>{{ u.phone }}</td>
          <td>{{ ROLE_LABEL[u.role] }}</td>
          <td>{{ u.siteNames?.join(', ') }}</td>
          <td>{{ u.lastLoginAt }}</td>
          <td>수정 ›</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>