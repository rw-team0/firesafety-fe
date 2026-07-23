<script setup>
import { ref, computed, onMounted } from 'vue'
import httpRequester from '../utils/httpRequester'
import { ROLE_LABEL } from '../constants/roles'
import ConfirmModal from '../components/ConfirmModal.vue'

// 실제 백엔드 Swagger(192.168.0.31:8080/swagger-ui, 2026-07-23 확인) 결과: GET /users/audit-logs 존재(파라미터 없음,
// 페이지네이션도 없이 전체 배열 반환) — 그래서 페이지네이션은 클라이언트에서 처리. 단 UserAuditLogRes엔
// targetName/actorName/content가 없고 targetUserId/actorUserId/beforeData/afterData만 내려와서,
// /users 목록과 조인해 이름을 붙임(단 대상이 이미 삭제된 계정이면 /users엔 없으므로 "#id"로만 표시됨)
const logs = ref([])
const usersById = ref({})
const loading = ref(false)
const restoringId = ref(null)
const page = ref(0)
const PAGE_SIZE = 13
const PAGE_WINDOW = 10

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
// 계정의 의미 있는 필드만 골라서 보여준다(userId/createdBy/deletedAt 같은 내부 필드는 제외)
const FIELD_LABEL = { name: '이름', role: '권한', email: '이메일', phone: '연락처' }
function summarize(log) {
  // 수정은 beforeData/afterData가 둘 다 있어서 실제로 바뀐 필드만 "전 → 후"로 보여줄 수 있음
  if (log.action === 'UPDATE' && log.beforeData && log.afterData) {
    const changed = Object.keys(FIELD_LABEL).filter((k) => log.beforeData[k] !== log.afterData[k])
    if (!changed.length) return '변경사항 없음'
    return changed.map((k) => `${FIELD_LABEL[k]}: ${log.beforeData[k] ?? '-'} → ${log.afterData[k] ?? '-'}`).join(', ')
  }

  const data = log.action === 'DELETE' ? log.beforeData : log.afterData
  if (!data || typeof data !== 'object') return '-'
  return Object.keys(FIELD_LABEL)
    .filter((k) => data[k] !== undefined)
    .map((k) => `${FIELD_LABEL[k]}: ${data[k] ?? '-'}`)
    .join(', ')
}

const totalPages = computed(() => Math.max(1, Math.ceil(logs.value.length / PAGE_SIZE)))
const pageNumbers = computed(() => {
  const start = Math.floor(page.value / PAGE_WINDOW) * PAGE_WINDOW
  const end = Math.min(start + PAGE_WINDOW, totalPages.value)
  return Array.from({ length: end - start }, (_, i) => start + i)
})
const pagedLogs = computed(() => logs.value.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE))
function goToPage(p) {
  if (p < 0 || p >= totalPages.value) return
  page.value = p
}

async function load() {
  loading.value = true
  const [logsRes, usersRes] = await Promise.all([
    httpRequester.get('/users/audit-logs'),
    httpRequester.get('/users'),
  ])
  logs.value = logsRes.data.resultData
  usersById.value = Object.fromEntries(usersRes.data.resultData.map(u => [u.userId, u]))
  page.value = 0
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
    <div style="display:flex;align-items:center;gap:10px;">
      <h2 style="margin:0;">계정 관리 이력</h2>
      <router-link class="btn" style="margin-left:auto;" to="/settings/accounts">계정목록으로</router-link>
    </div>

    <p v-if="loading" style="color:var(--color-text-muted);">불러오는 중...</p>
    <template v-else>
      <table style="width:100%;border-collapse:collapse;margin-top:16px;">
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
          <tr v-for="log in pagedLogs" :key="log.auditId" style="border-bottom:1px solid var(--color-border);">
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

      <p style="color:var(--color-text-muted);font-size:12px;margin:8px 0 0;">총 {{ logs.length }}건</p>
      <div style="display:flex;justify-content:center;align-items:center;gap:4px;margin-top:10px;">
        <button class="btn" :disabled="page === 0" @click="goToPage(0)">&laquo;</button>
        <button class="btn" :disabled="page === 0" @click="goToPage(page - 1)">&lsaquo;</button>
        <button
          v-for="p in pageNumbers"
          :key="p"
          class="btn"
          :style="p === page ? { background:'var(--color-accent)', color:'#fff' } : {}"
          @click="goToPage(p)"
        >{{ p + 1 }}</button>
        <button class="btn" :disabled="page >= totalPages - 1" @click="goToPage(page + 1)">&rsaquo;</button>
        <button class="btn" :disabled="page >= totalPages - 1" @click="goToPage(totalPages - 1)">&raquo;</button>
      </div>
    </template>

    <ConfirmModal v-if="restoringId" title="계정 복구 확인"
      message="이 계정을 복구하시겠습니까?"
      @confirm="restore(restoringId)" @cancel="restoringId = null" />
  </div>
</template>
