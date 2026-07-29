<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import httpRequester from '../utils/httpRequester'
import ConfirmModal from '../components/ConfirmModal.vue'
import BaseModal from '../components/common/BaseModal.vue'
import BasePagination from '../components/common/BasePagination.vue'
import { useAuthStore } from '../stores/auth'
import { useUiAlertStore } from '../stores/uiAlert'
import { formatDateTime, isoDate } from '@/utils/formatters'
import { ALERT_STATUS_LABELS as STATUS_LABEL, ALERT_TYPE_LABELS as TYPE_LABEL } from '@/constants/domainLabels'

const route = useRoute()
const auth = useAuthStore()
const uiAlert = useUiAlertStore()

const alerts = ref([])
const totalElements = ref(0)
const loading = ref(false)
const selected = ref([])
const canExport = auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN' // 관리자 이상만 출력(ALT-006)
const sites = ref([])
// AlertListRes엔 siteId/siteName 필드가 없어서(panelName만 있음, Swagger 확인) 현장명을 표로 보여주려면
// /panels로 panelName→siteId 매핑을 만들어 이름 기반으로 붙여야 함 — panelName이 겹치면 부정확할 수 있음
const panelSiteByName = ref({})

// 다른 이력 화면(통계/설비 관리이력/계정 관리이력)과 동일하게 기본 기간을 최근 7일로 설정
const today = new Date()
const weekAgo = new Date(today)
weekAgo.setDate(weekAgo.getDate() - 7)

const filters = ref({ from: isoDate(weekAgo), to: isoDate(today), status: '', type: '', siteId: '' })
// 기간 프리셋 드롭다운 → 다른 이력 화면(통계/설비 관리이력/계정 관리이력)과 동일한 달력(from/to 날짜입력)으로 통일하면서 더 이상 안 씀(주석 처리, 삭제 아님)
// const period = ref('') // '' | 'today' | '7d' | '30d' — AlertListReq엔 period 파라미터가 없어서 여기서 from/to로 환산해서 보냄
const page = ref(0) // 0-base(AlertListReq 기준)
const PAGE_SIZE = 13
const keyword = ref('') // AlertListReq엔 자유검색 파라미터가 없어서 이미 불러온 목록을 클라이언트에서 필터링
const appliedKeyword = ref('')

const STATUS_COLOR = { UNCONFIRMED: 'var(--color-danger)', CONFIRMED: 'var(--color-warning)', RESOLVED: 'var(--color-success)' }

function siteNameFor(panelName) {
  return panelSiteByName.value[panelName] ?? '-'
}

// 기간 프리셋 드롭다운 → 달력(from/to 날짜입력)으로 교체하면서 더 이상 안 씀(주석 처리, 삭제 아님)
// function applyPeriod() {
//   const iso = (d) => d.toISOString().slice(0, 10)
//   const today = new Date()
//   if (period.value === 'today') {
//     filters.value.from = iso(today)
//     filters.value.to = iso(today)
//   } else if (period.value === '7d') {
//     const from = new Date(today); from.setDate(from.getDate() - 7)
//     filters.value.from = iso(from)
//     filters.value.to = iso(today)
//   } else if (period.value === '30d') {
//     const from = new Date(today); from.setDate(from.getDate() - 30)
//     filters.value.from = iso(from)
//     filters.value.to = iso(today)
//   } else {
//     filters.value.from = ''
//     filters.value.to = ''
//   }
//   resetAndLoad()
// }

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

// ── 미처리 조치 목록(2026-07-27 추가 → 같은 날 속도 문제로 주석 처리, 삭제 아님) ──
// 전량 조회 방식(/alerts 페이지 순회)이 실사용에서 너무 느려서 잠정 비활성화함.
// 나중에 다시 켤 거면 페이지 크기(FETCH_SIZE)를 더 키우거나, 백엔드에 "가장 오래된 미확인/확인됨 N건"을
// 서버에서 직접 정렬해 주는 API를 새로 요청하는 쪽으로 접근하는 게 나을 것 같음.
/*
// "완전성"(빠뜨리는 게 없어야 한다) 목적이라, 화면 기본 필터(최근 7일 등)에 걸리면 안 됨 —
// 그래서 from/to 없이 status만으로 따로 조회한다(위 filters.value와는 별개의 조회).
// RESOLVED가 아닌 것만 필요한데 AlertListReq의 status는 값 하나만 받아서, UNCONFIRMED/CONFIRMED
// 두 번 나눠 조회해 합친다(둘 다 필요 없는 RESOLVED까지 받아오는 것보다 효율적).
const pendingList = ref([])        // 미처리(UNCONFIRMED+CONFIRMED) 전체, 경과시간 내림차순 정렬됨
const pendingListLoading = ref(false)
// "알림 이력"과 별도 탭으로 분리해서 전용 공간이 생겼으니, 카드 안에 얹었을 때와 달리 상위 N건으로 자르지 않고 전체를 보여준다
const activeTab = ref('history')   // 'history' | 'pending'

// 백엔드에 마감기한(SLA) 필드가 없어서, "발생 후 OVERDUE_HOURS시간 넘게 미처리"를 지연 기준으로 직접 정함.
// confirmedAt은 GET /alerts 응답에 없어서(엑셀 전용 응답에만 있음) 확인 이후 단계별로는 기준을 못 세우고,
// triggeredAt(발생시각) 하나로 전체 경과시간을 일괄 계산한다.
const OVERDUE_HOURS = 24
function elapsedHours(triggeredAt) {
  return (Date.now() - new Date(triggeredAt).getTime()) / (1000 * 60 * 60)
}
function isOverdue(alert) {
  return elapsedHours(alert.triggeredAt) >= OVERDUE_HOURS
}

// /alerts를 페이지 순회하며 전량 받아오는 공용 로직(설비 관리이력 화면과 동일한 패턴).
// 여기선 status 하나만 바뀌어가며 두 번 호출한다.
async function fetchAllAlertsByStatus(status) {
  // 100이면 미처리 건수가 조금만 많아도 요청이 여러 번 왕복해서 느려짐 — 설비 관리이력 화면과
  // 동일하게 1000으로 키워서 보통은 요청 한 번(상태당)으로 끝나게 함(정렬 정확성은 그대로 유지)
  const FETCH_SIZE = 1000
  let all = []
  let fetchPage = 0
  let total = Infinity
  while (all.length < total) {
    const params = { page: fetchPage, size: FETCH_SIZE, status }
    if (filters.value.siteId) params.siteId = filters.value.siteId // 현장 필터는 존중, 기간 필터는 제외
    const res = await httpRequester.get('/alerts', { params })
    const { content, totalElements: te } = res.data.resultData
    all = all.concat(content)
    total = te
    if (!content.length) break
    fetchPage++
  }
  return all
}

async function loadPendingList() {
  pendingListLoading.value = true
  const [unconfirmed, confirmed] = await Promise.all([
    fetchAllAlertsByStatus('UNCONFIRMED'),
    fetchAllAlertsByStatus('CONFIRMED'),
  ])
  // 가장 오래 방치된(경과시간이 긴) 것부터 보이게 정렬 — 지연 건이 자연히 위쪽에 모임
  pendingList.value = [...unconfirmed, ...confirmed].sort(
    (a, b) => elapsedHours(b.triggeredAt) - elapsedHours(a.triggeredAt)
  )
  pendingPage.value = 0 // 새로 불러온 데이터 기준으로 페이지도 처음부터
  pendingListLoading.value = false
}

// 알림 이력 표와 달리 이미 전량을 다 받아온 상태라, 페이지 이동이 API 재조회가 아니라
// 그냥 배열을 잘라 보여주는 것뿐이다(서버 페이지네이션 아님)
const pendingPage = ref(0)
const PENDING_PAGE_SIZE = 13
const pendingTotalPages = computed(() => Math.max(1, Math.ceil(pendingList.value.length / PENDING_PAGE_SIZE)))
const pendingPageNumbers = computed(() => {
  const start = Math.floor(pendingPage.value / PAGE_WINDOW) * PAGE_WINDOW
  const end = Math.min(start + PAGE_WINDOW, pendingTotalPages.value)
  return Array.from({ length: end - start }, (_, i) => start + i)
})
const pagedPendingList = computed(() =>
  pendingList.value.slice(pendingPage.value * PENDING_PAGE_SIZE, (pendingPage.value + 1) * PENDING_PAGE_SIZE)
)
function goToPendingPage(p) {
  if (p < 0 || p >= pendingTotalPages.value) return
  pendingPage.value = p
}

// 요약 배너용 집계는 화면에 실제로 보여주는 상위 N건이 아니라 전체 기준이어야 "놓친 게 없는지" 정확히 알 수 있음
const pendingOverdueCount = computed(() => pendingList.value.filter(isOverdue).length)
*/

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
  const count = selected.value.length
  for (const alertId of selected.value) {
    try {
      await httpRequester.patch(`/alerts/${alertId}/${action}`)
    } catch (e) {
      // 실패 토스트는 인터셉터가 이미 띄웠음 — 나머지 선택 항목은 계속 처리
    }
  }
  uiAlert.show(`선택한 ${count}건이 ${action === 'confirm' ? '확인' : '조치'} 처리되었습니다.`)
  load()
  // loadPendingList() // 미처리 조치 목록 기능 자체를 주석 처리해서 같이 비활성화(위 스크립트 상단 참고)
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
  uiAlert.show(`상태가 ${STATUS_LABEL.UNCONFIRMED} → ${STATUS_LABEL.CONFIRMED}(으)로 변경되었습니다.`)
  load()
  // loadPendingList() // 미처리 조치 목록 기능 자체를 주석 처리해서 같이 비활성화(위 스크립트 상단 참고)
}

async function submitResolve() {
  const body = resolutionNote.value ? { resolutionNote: resolutionNote.value } : undefined
  await httpRequester.patch(`/alerts/${detail.value.alertId}/resolve`, body) // Swagger 확인: AlertResolveReq
  resolveNoteMode.value = false
  resolutionNote.value = ''
  detail.value = null
  uiAlert.show(`상태가 ${STATUS_LABEL.CONFIRMED} → ${STATUS_LABEL.RESOLVED}(으)로 변경되었습니다.`)
  load()
  // loadPendingList() // 미처리 조치 목록 기능 자체를 주석 처리해서 같이 비활성화(위 스크립트 상단 참고)
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
  // 브라우저 저장 대화상자가 실제로 언제 닫히는지는 JS로 감지 불가능해서, 다운로드 완료 팝업은 따로 안 띄움
  // (브라우저 자체 다운로드바/알림이 이미 피드백 역할을 함)
}

async function confirmExport() {
  const onlySelected = pendingExport.value === 'selected'
  pendingExport.value = null
  await exportExcel(onlySelected)
}

onMounted(async () => {
  await Promise.all([load(), loadSitesAndPanels()]) // loadPendingList()는 미처리 조치 목록 비활성화로 제외
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

    <!-- 미처리 조치 목록 탭 + 요약 배너(2026-07-27 추가 → 같은 날 속도 문제로 주석 처리, 삭제 아님.
         스크립트 상단의 관련 상태/함수도 같이 주석 처리해뒀음) 탭이 없어져서 "알림 이력"만 남음
    탭: 미처리 건수는 "알림 이력" 탭에 있어도 눈에 띄어야 완전성 취지가 유지되므로,
         카운트를 탭 라벨 자체에 항상 보여준다(탭을 안 눌러도 몇 건 밀려있는지 보임)
    <div style="display:flex;gap:8px;margin-bottom:16px;border-bottom:1px solid var(--color-border);padding-bottom:12px;">
      <button class="btn" :class="{ 'btn-primary': activeTab === 'history' }" @click="activeTab = 'history'">알림 이력</button>
      <button class="btn" :class="{ 'btn-primary': activeTab === 'pending' }" @click="activeTab = 'pending'">
        미처리 조치 목록 ({{ pendingList.length }})
        <span v-if="pendingOverdueCount" :style="{ color: activeTab === 'pending' ? '#fff' : 'var(--color-danger)', fontWeight: 700 }"> · 지연 {{ pendingOverdueCount }}</span>
      </button>
    </div>

    미처리 조치 목록 탭: 위쪽 기간 필터(기본 최근 7일)와 무관하게 항상 전체 기간의
         미확인/확인됨(=아직 조치완료 안 됨) 건을 따로 보여준다. 완전성 목적이라 필터에 가려지면 안 됨
    <div v-if="activeTab === 'pending'" class="card" style="padding:16px 18px;margin-bottom:20px;">
      <p v-if="pendingListLoading" style="color:var(--color-text-muted);margin:0;"><span class="spinner"></span>불러오는 중...</p>
      <template v-else>
        "알림 이력" 표와 동일한 컬럼 구성(발생일시/현장/분전반/회로/유형/상태) + 경과시간 컬럼만 추가
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="text-align:left;border-bottom:1px solid var(--color-border);">
              <th style="padding:8px;">발생일시</th>
              <th style="padding:8px;">현장</th>
              <th style="padding:8px;">분전반</th>
              <th style="padding:8px;">회로</th>
              <th style="padding:8px;">유형</th>
              <th style="padding:8px;">상태</th>
              <th style="padding:8px;">경과</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="a in pagedPendingList" :key="a.alertId"
              style="border-bottom:1px solid var(--color-border);cursor:pointer;"
              :style="isOverdue(a) ? { background: 'rgba(236,34,31,.05)' } : {}"
              @click="openDetail(a)"
            >
              지연 건은 첫 셀에 좌측 빨간 테두리(border-collapse에서 tr 자체 테두리는 안정적으로 안 그려져서 td에 직접 줌)
              <td :style="{ padding: '8px', borderLeft: isOverdue(a) ? '3px solid var(--color-danger)' : '3px solid transparent' }">{{ formatDateTime(a.triggeredAt) }}</td>
              <td style="padding:8px;">{{ siteNameFor(a.panelName) }}</td>
              <td style="padding:8px;">{{ a.panelName }}</td>
              <td style="padding:8px;">{{ a.circuitNo != null ? `채널 ${a.circuitNo}` : '-' }}</td>
              <td style="padding:8px;">{{ TYPE_LABEL[a.type] ?? a.type }}</td>
              <td style="padding:8px;">
                <span class="badge" :style="{ background: STATUS_COLOR[a.status] }">{{ STATUS_LABEL[a.status] ?? a.status }}</span>
                <span v-if="isOverdue(a)" class="badge" style="background:var(--color-danger);margin-left:4px;">지연</span>
              </td>
              <td style="padding:8px;color:var(--color-text-muted);font-size:12px;">{{ Math.floor(elapsedHours(a.triggeredAt)) }}시간</td>
            </tr>
            <tr v-if="!pendingList.length">
              <td colspan="7" style="padding:16px;text-align:center;color:var(--color-text-muted);">미처리 건이 없습니다.</td>
            </tr>
          </tbody>
        </table>
        <p v-if="pendingList.length" style="color:var(--color-text-muted);font-size:12px;margin:8px 0 0;">총 {{ pendingList.length }}건</p>
        <div v-if="pendingList.length" style="display:flex;justify-content:center;align-items:center;gap:4px;margin-top:10px;">
          <button class="btn" :disabled="pendingPage === 0" @click="goToPendingPage(0)">&laquo;</button>
          <button class="btn" :disabled="pendingPage === 0" @click="goToPendingPage(pendingPage - 1)">&lsaquo;</button>
          <button
            v-for="p in pendingPageNumbers"
            :key="p"
            class="btn"
            :style="p === pendingPage ? { background:'var(--color-accent)', color:'#fff' } : {}"
            @click="goToPendingPage(p)"
          >{{ p + 1 }}</button>
          <button class="btn" :disabled="pendingPage >= pendingTotalPages - 1" @click="goToPendingPage(pendingPage + 1)">&rsaquo;</button>
          <button class="btn" :disabled="pendingPage >= pendingTotalPages - 1" @click="goToPendingPage(pendingTotalPages - 1)">&raquo;</button>
        </div>
      </template>
    </div>
    -->

    <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center;">
      <input v-model="keyword" placeholder="현장/분전반/유형 검색" class="field-input" style="margin-bottom:0;width:180px;" @keyup.enter="search" />
      <button class="btn" @click="search">검색</button>
      <input v-model="filters.from" type="date" class="field-input" style="margin-bottom:0;width:150px;" @change="resetAndLoad" />
      <span style="color:var(--color-text-muted);">~</span>
      <input v-model="filters.to" type="date" class="field-input" style="margin-bottom:0;width:150px;" @change="resetAndLoad" />
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
        <button class="btn" :disabled="!selected.length" @click="pendingExport = 'selected'">선택 출력</button>
        <button class="btn" @click="pendingExport = 'all'">전체출력</button>
      </template>
    </div>

    <p v-if="loading" style="color:var(--color-text-muted);"><span class="spinner"></span>불러오는 중...</p>
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
    <BasePagination
      :current-page="page"
      :total-pages="totalPages"
      :total-items="totalElements"
      @change="goToPage"
    />

    <!-- 분전반 상세확인 팝업 -->
    <BaseModal
      :visible="!!detail"
      :title="detail ? `${detail.panelName} 상세` : '알림 상세'"
      @close="detail=null"
    >
      <template #header>
        <div class="modal-header" :style="{ background: STATUS_COLOR[detail?.status], color:'#fff', borderBottom:'none' }">
          {{ detail?.panelName }} 상세
          <button class="modal-close" aria-label="닫기" @click="detail=null">×</button>
        </div>
      </template>

      <template #body>
        <div class="modal-body">
          <p>현장: {{ siteNameFor(detail?.panelName) }}</p>
          <p>회로: {{ detail?.circuitNo != null ? `채널 ${detail.circuitNo}` : '-' }}</p>
          <p>유형: {{ TYPE_LABEL[detail?.type] ?? detail?.type }}</p>
          <p>상태: {{ STATUS_LABEL[detail?.status] ?? detail?.status }}</p>
          <p>발생일시: {{ formatDateTime(detail?.triggeredAt) }}</p>

          <template v-if="resolveNoteMode">
            <label class="field-label">조치 메모(선택, 엑셀 비고란에 표시됨)</label>
            <textarea v-model="resolutionNote" rows="3" class="field-input" placeholder="예: 케이블 재접속" maxlength="500"></textarea>
          </template>
        </div>
      </template>

      <template #footer>
        <div class="modal-actions" style="padding:0 18px 18px;">
          <template v-if="resolveNoteMode">
            <button class="btn btn-primary" @click="submitResolve">조치 완료 저장</button>
            <button class="btn" @click="resolveNoteMode=false">취소</button>
          </template>
          <template v-else>
            <button v-if="detail?.status === 'UNCONFIRMED'" class="btn btn-primary" @click="requestAction('confirm')">확인 처리</button>
            <button v-if="detail?.status === 'CONFIRMED'" class="btn btn-primary" @click="resolveNoteMode=true">조치 완료</button>
            <button class="btn" @click="detail=null">닫기</button>
          </template>
        </div>
      </template>
    </BaseModal>

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
