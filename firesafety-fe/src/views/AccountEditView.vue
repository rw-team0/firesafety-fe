<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import apiClient from '../api/client'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const userId = route.params.userId

const form = ref({ name:'', email:'', phone:'', role:'GENERAL', siteIds:[] })
const targetRole = ref(null)
const loading = ref(true)
const errorMsg = ref('')

// FR-05-05: 대상이 ADMIN(현장관리자)이면 최고관리자만 수정 가능
const forbidden = computed(() => targetRole.value === 'ADMIN' && auth.role !== 'SUPER_ADMIN')

async function load() {
  const res = await apiClient.get('/api/users')
  const u = res.data.resultData.find(x => String(x.userId) === String(userId))
  if (u) { form.value = { ...u }; targetRole.value = u.role }
  loading.value = false
}
onMounted(load)

async function save() {
  if (forbidden.value) return
  try {
    await apiClient.put(`/api/users/${userId}`, form.value) // API-005
    router.push('/settings/accounts')
  } catch (e) {
    errorMsg.value = e.response?.data?.resultMessage || '수정에 실패했습니다.'
  }
}
async function remove() {
  if (forbidden.value) return
  if (!confirm('정말 삭제하시겠습니까?')) return
  await apiClient.delete(`/api/users/${userId}`) // API-006
  router.push('/settings/accounts')
}
</script>

<template>
  <div v-if="!loading">
    <div v-if="forbidden" class="banner-error">403 — 이 계정은 최고관리자만 수정할 수 있습니다.</div>
    <fieldset :disabled="forbidden">
      <input v-model="form.name" placeholder="이름">
      <input v-model="form.email" placeholder="이메일">
      <input v-model="form.phone" placeholder="연락처">
      <select v-model="form.role"><option value="GENERAL">일반</option><option value="ADMIN">관리자</option></select>
      <button @click="save">저장</button>
      <button @click="remove">삭제</button>
    </fieldset>
  </div>
</template>