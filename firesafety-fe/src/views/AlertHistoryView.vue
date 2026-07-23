<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import httpRequester from '../utils/httpRequester'
import ConfirmModal from '../components/ConfirmModal.vue'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const auth = useAuthStore()

const alerts = ref([])
const totalElements = ref(0)
const loading = ref(false)
const selected = ref([])
const canExport = auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN' // 관리자 이상만 출력(ALT-006)
const sites = ref([])
// AlertListRes엔 siteId/siteName 필드가 없어서(panelName만 있음, Swagger 확인) 현장명을 표로 보여주려면
// /panels로 panelName→siteId 매핑을 만들어 이름 기반으로 붙여야 함 — panelName이 겹치면 부정확할 수 있음
const panelSiteByName = ref({})

const filters = ref({ from: '', to: '', status: '', type: '', siteId: '' })
const period = ref('') // '' | 'today' | '7d' | '30d' — AlertListReq엔 period 파라미터가 없어서 여기서 from/to로 환산해서 보냄
const page = ref(0) // 0-base(AlertListReq 기준)
const PAGE_SIZE = 13
const keyword = ref('') // AlertListReq엔 자유검색 파라미터가 없어서 이미 불러온 목록을 클라이언트에서 필터링
const appliedKeyword = ref('')

const STATUS_LABEL = { UNCONFIRMED: '미확인', CONFIRMED: '확인됨', RESOLVED: '조치됨' }
const STATUS_COLOR = { UNCONFIRMED: 'var(--color-danger)', CONFIRMED: 'var(--color-warning)', RESOLVED: 'var(--color-success)' }
const TYPE_LABEL = { ARC: '아크', OVERHEAT: '과열', LEAKAGE: '누설', OVERCURRENT: '과전류', HUMIDITY: '습도', GAS: '가스', FIRE: '불꽃', DOOR_OPEN: '도어열림', DEVICE_ERROR: '장비오류', COMM_LOST: '통신두절' }

function siteNameFor(panelName) {
  return panelSiteByName.value[panelName] ?? '-'
}

function formatDateTime(v) {
  return v ? v.replace('T', ' ') : '-'
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
  resetAndLoad()
}

function search() {
  appliedKeyword.value = keyword.value.trim()
}

// 필터 바뀌면 이전 필터 기준 페이지가 새 결과 범위를 벗어날 수 있어 0페이지부터 다시 조회
function resetAndLoad() {
  page.value = 0
  load()
}

function goToPage(p) {
  if (p < 0 || p >= totalPages.value) return
  page.value = p
  load()
}

const totalPages = computed(() => Math.max(1, Math.ceil(totalElements.value / PAGE_SIZE)))

// 10개씩 묶어서 "1~10", "11~20" 페이지 번호 구간을 보여줌
const PAGE_WINDOW = 10
const pageNumbers = computed(() => {
  const start = Math.floor(page.value / PAGE_WINDOW) * PAGE_WINDOW
  const end = Math.min(start + PAGE_WINDOW, totalPages.value)
  return Array.from({ length: end - start }, (_, i) => start + i)
})

// 헤더 체크박스: 현재 페이지에 보이는 항목 기준으로 전체선택/해제
const allSelected = computed({
  get: () => filteredAlerts.value.length > 0 && filteredAlerts.value.every((a) => selected.value.includes(a.alertId)),
  set: (checked) => {
    selected.value = checked ? filteredAlerts.value.map((a) => a.alertId) : []
  },
})

const filteredAlerts = computed(() => {
  if (!appliedKeyword.value) return alerts.value
  const kw = appliedKeyword.value.toLowerCase()
  return alerts.value.filter((a) =>
    a.panelName?.toLowerCase().includes(kw) ||
    siteNameFor(a.panelName).toLowerCase().includes(kw) ||
    (TYPE_LABEL[a.type] ?? a.type).toLowerCase().includes(kw)
  )
})

async function loadSitesAndPanels() {
  const [sitesRes, panelsRes] = await Promise.all([
    httpRequester.get('/sites'),
    httpRequester.get('/panels'),
  ])
  sites.value = sitesRes.data.resultData
  const siteNameById = Object.fromEntries(sites.value.map(s => [s.siteId, s.name]))
  panelSiteByName.value = Object.fromEntries(
    panelsRes.data.resultData.map(p => [p.name, siteNameById[p.siteId] ?? '-'])
  )
}

const detail = ref(null) // 선택된 알림(상세확인 팝업)
const pendingAction = ref(null) // { alertId, action: 'confirm' }
const resolveNoteMode = ref(false) // 조치완료는 선택 메모(resolutionNote, Swagger 확인) 입력을 받아서 바로 처리
const resolutionNote = ref('')
const pendingExport = ref(null) // 'all' | 'selected' | null — 와이어프레임 기준 출력 전 확인 팝업
const pendingBulkAction = ref(null) // 'confirm' | 'resolve' | null — 체크박스로 선택한 여러 건 일괄 처리

async function load() {
  loading.value = true
  const params = { page: page.value, size: PAGE_SIZE }
  Object.entries(filters.value).forEach(([k, v]) => { if (v) params[k] = v })
  const res = await httpRequester.get('/alerts', { params }) // API-020
  alerts.value = res.data.resultData.content
  totalElements.value = res.data.resultData.totalElements
  selected.value = []
  loading.value = false
}

// 체크박스로 선택한 알림 여러 건을 순차 처리(상태 전이 API는 단건만 있어서 개수만큼 순차 호출).
// 상태가 안 맞는 항목(예: 이미 CONFIRMED인데 확인 처리 시도)은 백엔드가 409로 막고, 인터셉터가 에러를 띄운 뒤
// 나머지 항목은 이어서 처리한다.
async function runBulkAction() {
  const action = pendingBulkAction.value
  pendingBulkAction.value = null
  for (const alertId of selected.value) {
    try {
      await httpRequester.patch(`/alerts/${alertId}/${action}`)
    } catch (e) {
      // 실패 토스트는 인터셉터가 이미 띄웠음 — 나머지 선택 항목은 계속 처리
    }
  }
  load()
}

function openDetail(alert) {
  detail.value = alert
  resolveNoteMode.value = false
  resolutionNote.value = ''
}

function requestAction(action) {
  pendingAction.value = { alertId: detail.value.alertId, action }
}

async function runAction() {
  await httpRequester.patch(`/alerts/${pendingAction.value.alertId}/confirm`) // Swagger 확인: PATCH /api/alerts/{alertId}/confirm
  pendingAction.value = null
  detail.value = null
  load()
}

async function submitResolve() {
  const body = resolutionNote.value ? { resolutionNote: resolutionNote.value } : undefined
  await httpRequester.patch(`/alerts/${detail.value.alertId}/resolve`, body) // Swagger 확인: AlertResolveReq
  resolveNoteMode.value = false
  resolutionNote.value = ''
  detail.value = null
  load()
}

async function exportExcel(onlySelected) {
  const params = {}
  Object.entries(filters.value).forEach(([k, v]) => { if (v) params[k] = v })
  if (onlySelected) params.alertIds = selected.value
  const res = await httpRequester.get('/alerts/export', { params, responseType: 'blob' }) // API-023
  const url = URL.createObjectURL(new Blob([res.data]))
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
  const a = document.createElement('a')
  a.href = url
  a.download = `알림이력_${today}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}

async function confirmExport() {
  const onlySelected = pendingExport.value === 'selected'
  pendingExport.value = null
  await exportExcel(onlySelected)
}

onMounted(async () => {
  await Promise.all([load(), loadSitesAndPanels()])
  // 대시보드에서 알림 클릭 시 넘어온 경우, 해당 알림 상세팝업 자동 오픈
  const targetId = route.query.alertId
  if (targetId) {
    const found = alerts.value.find(a => String(a.alertId) === String(targetId))
    if (found) openDetail(found)
  }
})
</script>

<template>
  <div>
    <h2 style="margin-top:0;">알림 이력</h2>

    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center;">
      <input v-model="keyword" placeholder="현장/분전반/유형 검색" class="field-input" style="margin-bottom:0;width:180px;" @keyup.enter="search" />
      <button class="btn" @click="search">검색</button>
      <select v-model="period" class="field-input" style="margin-bottom:0;width:120px;" @change="applyPeriod">
        <option value="">전체 기간</option>
        <option value="today">오늘</option>
        <option value="7d">최근 7일</option>
        <option value="30d">최근 30일</option>
      </select>
      <select v-if="auth.role === 'SUPER_ADMIN'" v-model="filters.siteId" class="field-input" style="margin-bottom:0;width:140px;" @change="resetAndLoad">
        <option value="">전체 현장</option>
        <option v-for="s in sites" :key="s.siteId" :value="s.siteId">{{ s.name }}</option>
      </select>
      <select v-model="filters.type" class="field-input" style="margin-bottom:0;width:140px;" @change="resetAndLoad">
        <option value="">전체 유형</option>
        <option v-for="(label, key) in TYPE_LABEL" :key="key" :value="key">{{ label }}</option>
      </select>
      <select v-model="filters.status" class="field-input" style="margin-bottom:0;width:120px;" @change="resetAndLoad">
        <option value="">전체 상태</option>
        <option v-for="(label, key) in STATUS_LABEL" :key="key" :value="key">{{ label }}</option>
      </select>
      <template v-if="canExport">
        <button class="btn" style="margin-left:auto;" :disabled="!selected.length" @click="pendingBulkAction = 'confirm'">확인</button>
        <button class="btn" :disabled="!selected.length" @click="pendingBulkAction = 'resolve'">조치</button>
        <button class="btn" :disabled="!selected.length" @click="pendingExport = 'selected'">출력</button>
        <button class="btn" @click="pendingExport = 'all'">전체출력</button>
      </template>
    </div>

    <p v-if="loading" style="color:var(--color-text-muted);">불러오는 중...</p>
    <table v-else style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="text-align:left;border-bottom:1px solid var(--color-border);">
          <th v-if="canExport" style="padding:8px;"><input type="checkbox" v-model="allSelected" /></th>
          <th style="padding:8px;">발생일시</th>
          <th style="padding:8px;">현장</th>
          <th style="padding:8px;">분전반</th>
          <th style="padding:8px;">회로</th>
          <th style="padding:8px;">유형</th>
          <th style="padding:8px;">상태</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="a in filteredAlerts" :key="a.alertId" style="border-bottom:1px solid var(--color-border);cursor:pointer;">
          <td v-if="canExport" style="padding:8px;" @click.stop>
            <input type="checkbox" v-model="selected" :value="a.alertId" />
          </td>
          <td style="padding:8px;" @click="openDetail(a)">{{ formatDateTime(a.triggeredAt) }}</td>
          <td style="padding:8px;" @click="openDetail(a)">{{ siteNameFor(a.panelName) }}</td>
          <td style="padding:8px;" @click="openDetail(a)">{{ a.panelName }}</td>
          <td style="padding:8px;" @click="openDetail(a)">{{ a.circuitNo != null ? `채널 ${a.circuitNo}` : '-' }}</td>
          <td style="padding:8px;" @click="openDetail(a)">{{ TYPE_LABEL[a.type] ?? a.type }}</td>
          <td style="padding:8px;" @click="openDetail(a)">
            <span class="badge" :style="{ background: STATUS_COLOR[a.status] }">
              {{ STATUS_LABEL[a.status] ?? a.status }}
            </span>
          </td>
        </tr>
        <tr v-if="!filteredAlerts.length">
          <td :colspan="canExport ? 7 : 6" style="padding:16px;text-align:center;color:var(--color-text-muted);">알림 이력이 없습니다.</td>
        </tr>
      </tbody>
    </table>
    <p style="color:var(--color-text-muted);font-size:12px;margin:8px 0 0;">총 {{ totalElements }}건</p>
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

    <!-- 분전반 상세확인 팝업 -->
    <div v-if="detail" class="modal-overlay" @click.self="detail=null">
      <div class="modal-panel">
        <div class="modal-header" :style="{ background: STATUS_COLOR[detail.status], color:'#fff', borderBottom:'none' }">
          {{ detail.panelName }} 상세
        </div>
        <div class="modal-body">
          <p>현장: {{ siteNameFor(detail.panelName) }}</p>
          <p>회로: {{ detail.circuitNo != null ? `채널 ${detail.circuitNo}` : '-' }}</p>
          <p>유형: {{ TYPE_LABEL[detail.type] ?? detail.type }}</p>
          <p>상태: {{ STATUS_LABEL[detail.status] ?? detail.status }}</p>
          <p>발생시각: {{ formatDateTime(detail.triggeredAt) }}</p>

          <template v-if="resolveNoteMode">
            <label class="field-label">조치 메모(선택, 엑셀 비고란에 표시됨)</label>
            <textarea v-model="resolutionNote" rows="3" class="field-input" placeholder="예: 케이블 재접속" maxlength="500"></textarea>
          </template>

          <div class="modal-actions">
            <template v-if="resolveNoteMode">
              <button class="btn btn-primary" @click="submitResolve">조치 완료 저장</button>
              <button class="btn" @click="resolveNoteMode=false">취소</button>
            </template>
            <template v-else>
              <button v-if="detail.status === 'UNCONFIRMED'" class="btn btn-primary" @click="requestAction('confirm')">확인 처리</button>
              <button v-if="detail.status === 'CONFIRMED'" class="btn btn-primary" @click="resolveNoteMode=true">조치 완료</button>
              <button class="btn" @click="detail=null">닫기</button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <ConfirmModal v-if="pendingAction" title="경보 확인" message="이 경보를 확인 처리하시겠습니까?"
      @confirm="runAction" @cancel="pendingAction=null" />
    <ConfirmModal v-if="pendingExport" title="경보 이력 출력"
      :message="pendingExport === 'selected' ? '선택된 로그를 엑셀 파일로 출력하시겠습니까?' : '모든 로그를 엑셀 파일로 출력하시겠습니까?'"
      @confirm="confirmExport" @cancel="pendingExport=null" />
    <ConfirmModal v-if="pendingBulkAction" title="선택 항목 일괄 처리"
      :message="`선택한 ${selected.length}건을 ${pendingBulkAction === 'confirm' ? '확인 처리' : '조치 완료'}하시겠습니까?`"
      note="(상태가 안 맞는 항목은 처리되지 않습니다.)"
      @confirm="runBulkAction" @cancel="pendingBulkAction=null" />
  </div>
</template>
