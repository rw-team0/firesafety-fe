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
const siteDropdownOpen = ref(false)

// FR-05-05: 대상이 ADMIN(현장관리자)이면 최고관리자만 수정 가능
const forbidden = computed(() => targetRole.value === 'ADMIN' && auth.role !== 'SUPER_ADMIN')
const selectedSiteNames = computed(() =>
  sites.value.filter(s => form.value.siteIds?.includes(s.siteId)).map(s => s.name).join(', ')
)

async function load() {
  const [usersRes, sitesRes] = await Promise.all([
    httpRequester.get('/users'),
    httpRequester.get('/sites'), // API-009
  ])
  sites.value = sitesRes.data.resultData
  const u = usersRes.data.resultData.find(x => String(x.userId) === String(userId))
  if (u) {
    // UserListRes엔 siteIds가 없어서 { ...u }로 덮어쓰면 항상 빈 값이 됨 — 담당현장은
    // 별도 API(GET /users/{id}/site-assignments)로 조회해서 붙여야 실제 배정 상태가 보임
    form.value = { ...u, siteIds: [] }
    targetRole.value = u.role
    const assignRes = await httpRequester.get(`/users/${userId}/site-assignments`)
    form.value.siteIds = assignRes.data.resultData.map(a => a.siteId)
  }
  loading.value = false
}
onMounted(load)

async function save() {
  if (forbidden.value) return
  try {
    // UserUpdateReq{email,name,phone?,role}엔 siteIds가 없어서 PUT 본문에서 빼고,
    // 담당현장은 저장 성공 후 별도로 site-assignments API에 동기화(AccountAddView.vue와 동일한 방식)
    const { siteIds, ...body } = form.value
    await httpRequester.put(`/users/${userId}`, body) // API-005
    await httpRequester.post(`/users/${userId}/site-assignments`, { siteIds: siteIds ?? [] })
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

        <label class="field-label">권한</label>
        <select v-model="form.role" class="field-input"><option value="GENERAL">일반</option><option value="ADMIN">관리자</option></select>

        <label class="field-label">담당현장</label>
        <div style="position:relative;margin-bottom:16px;" tabindex="0" @blur="siteDropdownOpen = false">
          <div
            class="field-input"
            style="cursor:pointer;display:flex;justify-content:space-between;align-items:center;margin-bottom:0;"
            @click="siteDropdownOpen = !siteDropdownOpen"
          >
            <span :style="{ color: selectedSiteNames ? 'var(--color-text)' : 'var(--color-text-muted)' }">{{ selectedSiteNames || '선택 안 함' }}</span>
            <span style="color:var(--color-text-muted);">{{ siteDropdownOpen ? '▴' : '▾' }}</span>
          </div>
          <div
            v-if="siteDropdownOpen"
            class="card"
            style="position:absolute;top:100%;left:0;right:0;z-index:10;margin-top:4px;max-height:200px;overflow-y:auto;padding:8px;"
          >
            <label v-for="s in sites" :key="s.siteId" style="display:flex;align-items:center;gap:8px;padding:6px 4px;cursor:pointer;">
              <input type="checkbox" :value="s.siteId" v-model="form.siteIds">
              {{ s.name }}
            </label>
            <p v-if="!sites.length" style="color:var(--color-text-muted);font-size:12px;margin:4px;">등록된 현장이 없습니다.</p>
          </div>
        </div>

        <div style="display:flex;gap:8px;margin-top:16px;">
          <button class="btn" @click="save">저장</button>
          <button class="btn" @click="cancel">취소</button>
        </div>
      </fieldset>
    </div>
  </div>
</template>
