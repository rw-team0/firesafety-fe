<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import httpRequester from '../utils/httpRequester'
import { useAuthStore } from '../stores/auth'
import ConfirmModal from '../components/ConfirmModal.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const userId = route.params.userId

const form = ref({ name:'', email:'', phone:'', role:'GENERAL', siteIds:[] })
const targetRole = ref(null)
const sites = ref([])
const loading = ref(true)
const errorMsg = ref('')
const showDeleteConfirm = ref(false)

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

async function confirmRemove() {
  if (forbidden.value) return
  await httpRequester.delete(`/users/${userId}`) // API-006
  router.push('/settings/accounts')
}
</script>

<template>
  <div v-if="!loading">
    <div v-if="forbidden" class="banner-error">403 — 이 계정은 최고관리자만 수정할 수 있습니다.</div>
    <div v-if="errorMsg" class="banner-error">{{ errorMsg }}</div>
    <fieldset :disabled="forbidden">
      <input v-model="form.name" placeholder="이름">
      <input v-model="form.email" placeholder="이메일">
      <input v-model="form.phone" placeholder="연락처">
      <select v-model="form.role"><option value="GENERAL">일반</option><option value="ADMIN">관리자</option></select>

      <div>
        <p>담당현장</p>
        <label v-for="s in sites" :key="s.siteId" style="display:block;">
          <input type="checkbox" v-model="form.siteIds" :value="s.siteId" />{{ s.name }}
        </label>
      </div>

      <button @click="save">저장</button>
      <button @click="showDeleteConfirm = true">삭제</button>
    </fieldset>

    <ConfirmModal v-if="showDeleteConfirm" title="계정 삭제 확인"
      message="정말로 이 계정을 삭제하시겠습니까?" danger
      @confirm="confirmRemove" @cancel="showDeleteConfirm = false" />
  </div>
</template>
