<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import httpRequester from '../utils/httpRequester'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const userId = route.params.userId

const form = ref({ name:'', email:'', phone:'', role:'GENERAL', siteIds:[] })
const targetRole = ref(null)
const sites = ref([])
const loading = ref(true)
const errorMsg = ref('')

// FR-05-05: 대상이 ADMIN(현장관리자)이면 최고관리자만 수정 가능
const forbidden = computed(() => targetRole.value === 'ADMIN' && auth.role !== 'SUPER_ADMIN')

async function load() {
  const [usersRes, sitesRes] = await Promise.all([
    httpRequester.get('/users'),
    httpRequester.get('/sites'), // API-009
  ])
  sites.value = sitesRes.data.resultData
  const u = usersRes.data.resultData.find(x => String(x.userId) === String(userId))
  if (u) { form.value = { ...u }; targetRole.value = u.role }
  loading.value = false
}
onMounted(load)

async function save() {
  if (forbidden.value) return
  try {
    await httpRequester.put(`/users/${userId}`, form.value) // API-005
    router.push('/settings/accounts')
  } catch (e) {
    errorMsg.value = e.response?.data?.resultMessage || '수정에 실패했습니다.'
  }
}

function cancel() {
  router.push('/settings/accounts')
}
</script>

<template>
  <div v-if="!loading">
    <h2 style="margin-top:0;">계정 수정</h2>
    <div class="card" style="max-width:420px;padding:24px;">
      <div v-if="forbidden" class="banner banner-danger">403 — 이 계정은 최고관리자만 수정할 수 있습니다.</div>
      <div v-if="errorMsg" class="banner banner-danger">{{ errorMsg }}</div>
      <fieldset :disabled="forbidden" style="border:none;padding:0;margin:0;">
        <label class="field-label">이름</label>
        <input v-model="form.name" placeholder="이름" class="field-input">

        <label class="field-label">이메일</label>
        <input v-model="form.email" placeholder="이메일" class="field-input">

        <label class="field-label">연락처</label>
        <input v-model="form.phone" placeholder="연락처" class="field-input">

        <label class="field-label">역할</label>
        <select v-model="form.role" class="field-input"><option value="GENERAL">일반</option><option value="ADMIN">관리자</option></select>

        <label class="field-label">담당현장 (Ctrl/Cmd+클릭으로 다중 선택)</label>
        <select v-model="form.siteIds" multiple class="field-input" style="height:120px;">
          <option v-for="s in sites" :key="s.siteId" :value="s.siteId">{{ s.name }}</option>
        </select>

        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn btn-primary" @click="save">저장</button>
          <button class="btn" @click="cancel">취소</button>
        </div>
      </fieldset>
    </div>
  </div>
</template>
