<script setup>
import { ref, onMounted, watch } from 'vue'
import httpRequester from '../utils/httpRequester'
import ActionResultModal from '../components/ActionResultModal.vue'
import BaseCard from '../components/common/BaseCard.vue'
import PageHeader from '../components/common/PageHeader.vue'
import { USER_ROLE_LABELS } from '@/constants/domainLabels'

const users = ref([])
const sites = ref([])
const userId = ref(null)
const assignedSiteIds = ref([])
const saving = ref(false)

// 저장 결과 모달
const assignmentResult = ref(null)

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

// 결과 모달 대상 계정
function assignmentTargetName() {
  const selectedUser = users.value.find((user) => user.userId === userId.value)
  if (!selectedUser) return ''
  return `${selectedUser.name} (${USER_ROLE_LABELS[selectedUser.role] ?? selectedUser.role})`
}

async function save() {
  saving.value = true
  try {
    await httpRequester.post(`/users/${userId.value}/site-assignments`, { siteIds: assignedSiteIds.value }) // API-015
    assignmentResult.value = {
      itemName: assignmentTargetName(),
    }
  } finally {
    saving.value = false
  }
}

function closeAssignmentResult() {
  assignmentResult.value = null
}

onMounted(async () => {
  await Promise.all([loadUsers(), loadSites()])
  await loadAssignments()
})
</script>

<template>
  <div class="site-assignment-page">
    <PageHeader title="담당 현장 배정" />

    <BaseCard class="site-assignment-card">
      <label class="field-label">계정</label>
      <select v-model="userId" class="field-input">
        <option v-for="u in users" :key="u.userId" :value="u.userId">
          {{ u.name }} ({{ USER_ROLE_LABELS[u.role] ?? u.role }})
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
    </BaseCard>

    <ActionResultModal
      :visible="!!assignmentResult"
      title="담당 현장 저장 완료"
      desc="담당 현장이 저장되었습니다."
      :item-name="assignmentResult?.itemName"
      action-label="저장 완료"
      @close="closeAssignmentResult"
    />
  </div>
</template>

<style scoped>
.site-assignment-page {
  min-height: 100%;
}

.site-assignment-card {
  max-width: 420px;
}
</style>
