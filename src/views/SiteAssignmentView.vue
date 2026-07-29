<script setup>
import { ref, onMounted, watch } from 'vue'
import httpRequester from '../utils/httpRequester'
import { ROLE_LABEL } from '../constants/roles'
import { useUiAlertStore } from '../stores/uiAlert'

const uiAlert = useUiAlertStore()
const users = ref([])
const sites = ref([])
const userId = ref(null)
const assignedSiteIds = ref([])
const saving = ref(false)
// 저장 완료 알림을 전역 팝업(uiAlert)으로 통일하면서 더 이상 안 씀(주석 처리, 삭제 아님)
const savedMessage = ref('')

async function loadUsers() {
  const res = await httpRequester.get('/users') // API-003
  users.value = res.data.resultData
  if (users.value.length) userId.value = users.value[0].userId
}
async function loadSites() {
  const res = await httpRequester.get('/sites') // API-009
  sites.value = res.data.resultData
}
async function loadAssignments() {
  if (!userId.value) return
  const res = await httpRequester.get(`/users/${userId.value}/site-assignments`) // API-014
  assignedSiteIds.value = res.data.resultData.map(s => s.siteId)
}
watch(userId, loadAssignments)

async function save() {
  saving.value = true
  try {
    await httpRequester.post(`/users/${userId.value}/site-assignments`, { siteIds: assignedSiteIds.value }) // API-015
    uiAlert.show('담당 현장이 저장되었습니다.')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadUsers(), loadSites()])
  await loadAssignments()
})
</script>

<template>
  <div>
    <h2 style="margin-top:0;">담당 현장 배정</h2>
    <div class="card" style="max-width:420px;padding:24px;">
      <label class="field-label">계정</label>
      <select v-model="userId" class="field-input">
        <option v-for="u in users" :key="u.userId" :value="u.userId">
          {{ u.name }} ({{ ROLE_LABEL[u.role] ?? u.role }})
        </option>
      </select>

      <p class="field-label" style="margin-bottom:8px;">담당 현장</p>
      <div style="margin-bottom:16px;">
        <label v-for="s in sites" :key="s.siteId" style="display:block;padding:4px 0;font-size:14px;color:var(--color-text);">
          <input type="checkbox" v-model="assignedSiteIds" :value="s.siteId" />{{ s.name }}
        </label>
        <p v-if="!sites.length" style="color:var(--color-text-muted);">등록된 현장이 없습니다.</p>
      </div>

      <button class="btn btn-primary" :disabled="saving || !userId" @click="save">{{ saving ? '저장 중...' : '저장' }}</button>
      저장 완료 알림을 우측 인라인 텍스트 대신 전역 팝업(uiAlert)으로 통일하면서 더 이상 안 씀(주석 처리, 삭제 아님)
      <span v-if="savedMessage" style="color:var(--color-success);margin-left:8px;font-size:13px;">{{ savedMessage }}</span>
     
    </div>
  </div>
</template>
