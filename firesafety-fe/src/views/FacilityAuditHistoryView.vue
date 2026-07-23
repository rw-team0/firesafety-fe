<script setup>
import { ref, computed, onMounted } from 'vue'
import httpRequester from '../utils/httpRequester'
import { useUiAlertStore } from '../stores/uiAlert'

const uiAlert = useUiAlertStore()

// 실제 백엔드 Swagger("firesafety API 가이드" 3-5절, 2026-07-23 확인) 결과: GET /facilities/audit-logs(SUPER_ADMIN 전용,
// targetType/targetId/actorUserId/action/from/to/page/size 필터, 페이지네이션 응답) 존재. 응답(FacilityAuditLogRes)엔
// targetName/actorName/content가 없어서(계정관리이력과 동일한 패턴) /sites·/panels·/users와 조인해서 이름을 붙임.
// 단 CIRCUIT은 전역 조회 API가 없어서(분전반별로만 GET /panels/{id}/circuits 조회 가능) 이름 해석이 안 되어 ID만 표시함.
// action enum도 계정관리이력(CREATE/UPDATE/DELETE/RESTORE/PASSWORD_RESET)과 다르게 CREATE/UPDATE/DELETE 3종뿐이고
// actionLabel 필드가 없어서 여기서 직접 한글 라벨을 매핑함. 엑셀 출력 전용 API는 없어서(/alerts/export 같은 게 없음) 안내만.
const logs = ref([])
const totalElements = ref(0)
const loading = ref(false)
const selected = ref([])

const sitesById = ref({})
const panelsById = ref({})
const usersById = ref({})

const keyword = ref('')
const appliedKeyword = ref('')
const period = ref('')
const filters = ref({ from: '', to: '' })

const TARGET_TYPE_LABEL = { SITE: '현장', PANEL: '분전반', CIRCUIT: '회로' }
const ACTION_LABEL = { CREATE: '추가', UPDATE: '수정', DELETE: '삭제' }
const ACTION_COLOR = { CREATE: 'var(--color-success)', UPDATE: 'var(--color-warning)', DELETE: 'var(--color-danger)' }

function formatDateTime(v) {
  return v ? v.replace('T', ' ') : '-'
}
function targetName(log) {
  if (log.targetType === 'SITE') return sitesById.value[log.targetId]?.name ?? `#${log.targetId}`
  if (log.targetType === 'PANEL') return panelsById.value[log.targetId]?.name ?? `#${log.targetId}`
  return `회로 #${log.targetId}`
}
function actorName(userId) {
  if (userId == null) return '시스템'
  return usersById.value[userId]?.name ?? `#${userId}`
}
function summarize(log) {
  const data = log.action === 'DELETE' ? log.beforeData : log.afterData
  if (!data || typeof data !== 'object') return '-'
  return Object.entries(data).filter(([k]) => k !== 'password').map(([k, v]) => `${k}: ${v}`).join(', ')
}

async function loadLookups() {
  const [sitesRes, panelsRes, usersRes] = await Promise.all([
    httpRequester.get('/sites'),
    httpRequester.get('/panels'),
    httpRequester.get('/users'),
  ])
  sitesById.value = Object.fromEntries(sitesRes.data.resultData.map((s) => [s.siteId, s]))
  panelsById.value = Object.fromEntries(panelsRes.data.resultData.map((p) => [p.panelId, p]))
  usersById.value = Object.fromEntries(usersRes.data.resultData.map((u) => [u.userId, u]))
}

async function load() {
  loading.value = true
  const params = { page: 0, size: 50 }
  if (filters.value.from) params.from = filters.value.from
  if (filters.value.to) params.to = filters.value.to
  const res = await httpRequester.get('/facilities/audit-logs', { params })
  logs.value = res.data.resultData.content
  totalElements.value = res.data.resultData.totalElements
  selected.value = []
  loading.value = false
}

function applyPeriod() {
  const iso = (d) => d.toISOString().slice(0, 10)
  const today = new Date()
  if (period.value === 'today') {
    filters.value.from = iso(today)
    filters.value.to = iso(today)
  } else if (period.value === '7d') {
    const from = new Date(today); from.setDate(from.getDate() - 7)
    filters.value.from = iso(from)
    filters.value.to = iso(today)
  } else if (period.value === '30d') {
    const from = new Date(today); from.setDate(from.getDate() - 30)
    filters.value.from = iso(from)
    filters.value.to = iso(today)
  } else {
    filters.value.from = ''
    filters.value.to = ''
  }
  load()
}
function search() {
  appliedKeyword.value = keyword.value.trim()
}
const filteredLogs = computed(() => {
  if (!appliedKeyword.value) return logs.value
  const kw = appliedKeyword.value.toLowerCase()
  return logs.value.filter((l) => targetName(l).toLowerCase().includes(kw) || actorName(l.actorUserId).toLowerCase().includes(kw))
})

const allSelected = computed(() => filteredLogs.value.length > 0 && selected.value.length === filteredLogs.value.length)
function toggleSelectAll() {
  selected.value = allSelected.value ? [] : filteredLogs.value.map((l) => l.auditId)
}
function exportExcel() {
  // 설비 변경 이력 엑셀 출력 API는 없음(Swagger 확인, /alerts/export 같은 전용 엔드포인트가 없음)
  uiAlert.show('설비 관리 이력 엑셀 출력 기능은 아직 백엔드에 구현되어 있지 않습니다.')
}

onMounted(async () => {
  await loadLookups()
  await load()
})
</script>

<template>
  <div>
    <h2 style="margin-top:0;">설비 관리 이력</h2>

    <div style="display:flex;gap:8px;margin-bottom:16px;align-items:center;flex-wrap:wrap;">
      <input v-model="keyword" placeholder="이름/관리계정명 검색" class="field-input" style="margin-bottom:0;width:200px;" @keyup.enter="search" />
      <button class="btn" @click="search">검색</button>
      <select v-model="period" class="field-input" style="margin-bottom:0;width:130px;" @change="applyPeriod">
        <option value="">전체 기간</option>
        <option value="today">오늘</option>
        <option value="7d">최근 7일</option>
        <option value="30d">최근 30일</option>
      </select>
      <button class="btn" style="margin-left:auto;" @click="exportExcel">전체 출력</button>
      <button class="btn" :disabled="!selected.length" @click="exportExcel">선택 출력</button>
    </div>

    <p v-if="loading" style="color:var(--color-text-muted);">불러오는 중...</p>
    <table v-else style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="text-align:left;border-bottom:1px solid var(--color-border);">
          <th style="padding:8px;"><input type="checkbox" :checked="allSelected" @change="toggleSelectAll" /></th>
          <th style="padding:8px;">이름</th>
          <th style="padding:8px;">설비 종류</th>
          <th style="padding:8px;">관리한 계정명</th>
          <th style="padding:8px;">관리사항</th>
          <th style="padding:8px;">내용</th>
          <th style="padding:8px;">관리 시점</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="log in filteredLogs" :key="log.auditId" style="border-bottom:1px solid var(--color-border);">
          <td style="padding:8px;"><input type="checkbox" v-model="selected" :value="log.auditId" /></td>
          <td style="padding:8px;">{{ targetName(log) }}</td>
          <td style="padding:8px;">{{ TARGET_TYPE_LABEL[log.targetType] ?? log.targetType }}</td>
          <td style="padding:8px;">{{ actorName(log.actorUserId) }}</td>
          <td style="padding:8px;">
            <span class="badge" :style="{ background: ACTION_COLOR[log.action] }">{{ ACTION_LABEL[log.action] ?? log.action }}</span>
          </td>
          <td style="padding:8px;font-size:12px;color:var(--color-text-muted);">{{ summarize(log) }}</td>
          <td style="padding:8px;">{{ formatDateTime(log.createdAt) }}</td>
        </tr>
        <tr v-if="!filteredLogs.length">
          <td colspan="7" style="padding:16px;text-align:center;color:var(--color-text-muted);">이력이 없습니다.</td>
        </tr>
      </tbody>
    </table>
    <p style="color:var(--color-text-muted);font-size:12px;">총 {{ totalElements }}건</p>
  </div>
</template>
