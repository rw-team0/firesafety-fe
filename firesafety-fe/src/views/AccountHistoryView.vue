<script setup>
import { ref, onMounted } from 'vue'
import httpRequester from '../utils/httpRequester'
import { ROLE_LABEL } from '../constants/roles'
import ConfirmModal from '../components/ConfirmModal.vue'

// 실제 백엔드 Swagger(192.168.0.31:8080/swagger-ui, 2026-07-23 확인) 결과: GET /users/audit-logs 존재(파라미터 없음,
// 페이지네이션도 없이 전체 배열 반환). 단 UserAuditLogRes엔 targetName/actorName/content가 없고
// targetUserId/actorUserId/beforeData/afterData(JsonNode)만 내려와서, /users 목록과 조인해 이름을 붙임
// (단 대상이 이미 삭제된 계정이면 /users엔 없으므로 "#id"로만 표시됨 — 별도 이름 조회 API는 없음)
const logs = ref([])
const usersById = ref({})
const loading = ref(false)
const restoringId = ref(null)

const badgeStyle = {
  CREATE: { background: 'var(--color-success)' },
  UPDATE: { background: 'var(--color-warning)' },
  DELETE: { background: 'var(--color-danger)' },
  RESTORE: { background: 'var(--color-success)' },
  PASSWORD_RESET: { background: 'var(--color-offline)' },
}

function targetLabel(userId) {
  const u = usersById.value[userId]
  return u ? `${u.name} (${ROLE_LABEL[u.role] ?? u.role})` : `#${userId}`
}
function actorLabel(userId) {
  if (userId == null) return '시스템'
  const u = usersById.value[userId]
  return u ? u.name : `#${userId}`
}
function summarize(log) {
  const data = log.action === 'DELETE' ? log.beforeData : log.afterData
  if (!data || typeof data !== 'object') return '-'
  return Object.entries(data).filter(([k]) => k !== 'password').map(([k, v]) => `${k}: ${v}`).join(', ')
}

async function load() {
  loading.value = true
  const [logsRes, usersRes] = await Promise.all([
    httpRequester.get('/users/audit-logs'),
    httpRequester.get('/users'),
  ])
  logs.value = logsRes.data.resultData
  usersById.value = Object.fromEntries(usersRes.data.resultData.map(u => [u.userId, u]))
  loading.value = false
}
onMounted(load)

async function restore(userId) {
  restoringId.value = null
  await httpRequester.patch(`/users/${userId}/restore`) // Swagger 확인: PATCH /api/users/{userId}/restore
  load()
}
</script>

<template>
  <div>
    <h2 style="margin-top:0;">계정 관리 이력</h2>

    <p v-if="loading" style="color:var(--color-text-muted);">불러오는 중...</p>
    <table v-else style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="text-align:left;border-bottom:1px solid var(--color-border);">
          <th style="padding:8px;">대상계정</th>
          <th style="padding:8px;">관리계정</th>
          <th style="padding:8px;">관리유형</th>
          <th style="padding:8px;">변경 내용</th>
          <th style="padding:8px;">관리시점</th>
          <th style="padding:8px;"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in logs" :key="log.auditId" style="border-bottom:1px solid var(--color-border);">
          <td style="padding:8px;">{{ targetLabel(log.targetUserId) }}</td>
          <td style="padding:8px;">{{ actorLabel(log.actorUserId) }}</td>
          <td style="padding:8px;">
            <span class="badge" :style="{ background: badgeStyle[log.action]?.background }">{{ log.actionLabel ?? log.action }}</span>
          </td>
          <td style="padding:8px;font-size:12px;color:var(--color-text-muted);">{{ summarize(log) }}</td>
          <td style="padding:8px;">{{ log.createdAt }}</td>
          <td style="padding:8px;">
            <button v-if="log.action === 'DELETE'" class="btn" @click="restoringId = log.targetUserId">복구</button>
          </td>
        </tr>
        <tr v-if="!logs.length">
          <td colspan="6" style="padding:16px;text-align:center;color:var(--color-text-muted);">이력이 없습니다.</td>
        </tr>
      </tbody>
    </table>

    <ConfirmModal v-if="restoringId" title="계정 복구 확인"
      message="이 계정을 복구하시겠습니까?"
      @confirm="restore(restoringId)" @cancel="restoringId = null" />
  </div>
</template>
