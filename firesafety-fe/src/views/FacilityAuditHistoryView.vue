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
const page = ref(0)
const PAGE_SIZE = 13
const PAGE_WINDOW = 10

const TARGET_TYPE_LABEL = { SITE: '현장', PANEL: '분전반', CIRCUIT: '회로' }
const ACTION_LABEL = { CREATE: '추가', UPDATE: '수정', DELETE: '삭제' }
const ACTION_COLOR = { CREATE: 'var(--color-success)', UPDATE: 'var(--color-warning)', DELETE: 'var(--color-danger)' }

// beforeData/afterData가 실제로는 엔티티 전체(id/status/isOnline/생성·수정·삭제시각 등 내부 필드 포함)를
// 통째로 JSON 직렬화해서 내려온다고 확인됨(2026-07-24) — 그대로 나열하면 알아보기 힘들어서
// targetType별로 의미 있는 필드만 골라 라벨을 붙여 보여준다(AccountHistoryView.vue와 동일한 패턴)
const FIELD_LABEL_BY_TYPE = {
  SITE: { name: '이름', address: '주소' },
  PANEL: {
    name: '분전반명', mNo: '장비번호', deviceSerial: '일련번호', circuitCount: '회로개수', installedAt: '설치일',
    leakMaThreshold: 'zct누설전류', tempThreshold: '온도임계값', humidityThreshold: '습도임계값',
    overcurrentThreshold: '과전류임계값', gasThreshold: '가스임계값', fireThreshold: '불꽃임계값',
  },
  CIRCUIT: { channelNo: '채널번호', loadType: '부하종류' },
}

function formatDateTime(v) {
  return v ? v.replace('T', ' ') : '-'
}
// 2026-07-24 와이어프레임(S-015) 기준: "이름"은 단독 명칭이 아니라 상위 계층까지 붙인 경로형
// ("레이월드02-분전반03", "레이월드01-분전반01-회로10")으로 표시. 대상이 이미 삭제됐으면 /sites·/panels
// 목록 조회로는 이름을 못 찾으므로, beforeData/afterData(로그 자체가 들고 있는 스냅샷)의 name/siteId/panelId를
// 우선 쓰고, 조회 가능한 경우에만 상위 계층 이름을 붙인다(상위도 이미 삭제됐으면 그 단계는 생략).
function targetName(log) {
  const data = log.afterData ?? log.beforeData ?? {}
  if (log.targetType === 'SITE') {
    return data.name ?? sitesById.value[log.targetId]?.name ?? `#${log.targetId}`
  }
  if (log.targetType === 'PANEL') {
    const panelName = data.name ?? panelsById.value[log.targetId]?.name ?? `#${log.targetId}`
    const siteId = data.siteId ?? panelsById.value[log.targetId]?.siteId
    const siteName = siteId != null ? sitesById.value[siteId]?.name : null
    return siteName ? `${siteName}-${panelName}` : panelName
  }
  // CIRCUIT: 회로 자체 이름이 없어서 채널번호로 "회로{N}" 라벨을 만들고, 소속 분전반/현장을 붙인다
  const circuitLabel = `회로${data.channelNo ?? ''}`
  const panelId = data.panelId
  const panel = panelId != null ? panelsById.value[panelId] : null
  const panelName = panel?.name ?? (panelId != null ? `#${panelId}` : null)
  const siteName = panel ? sitesById.value[panel.siteId]?.name : null
  return [siteName, panelName, circuitLabel].filter(Boolean).join('-') || `회로 #${log.targetId}`
}
function actorName(userId) {
  if (userId == null) return '시스템'
  return usersById.value[userId]?.name ?? `#${userId}`
}
// 2026-07-24 와이어프레임 기준: "내용"은 필드별 상세 나열이 아니라 훨씬 단순한 표기 —
// 추가/삭제는 "-", 수정은 바뀐 필드명만 "OO 수정" 형태로 나열
function summarize(log) {
  if (log.action !== 'UPDATE') return '-'
  if (!log.beforeData || !log.afterData) return '-'
  const fieldLabel = FIELD_LABEL_BY_TYPE[log.targetType] ?? {}
  const changed = Object.keys(fieldLabel).filter((k) => log.beforeData[k] !== log.afterData[k])
  if (!changed.length) return '-'
  return changed.map((k) => `${fieldLabel[k]} 수정`).join(', ')
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
  // 검색(키워드)은 서버 파라미터가 없어서 클라이언트에서 처리 — AccountHistoryView.vue와 동일한 패턴으로
  // 맞추려면 전체 데이터가 필요함. size를 크게(1000) 한 번에 요청했더니 실제 백엔드가 400을 반환함(페이지 크기
  // 상한 추정, 2026-07-24) — 서버 기본/제한 크기(100)로 나눠서 totalElements를 다 받을 때까지 반복 조회
  const FETCH_SIZE = 100
  let all = []
  let fetchPage = 0
  let total = Infinity
  while (all.length < total) {
    const params = { page: fetchPage, size: FETCH_SIZE }
    if (filters.value.from) params.from = filters.value.from
    if (filters.value.to) params.to = filters.value.to
    const res = await httpRequester.get('/facilities/audit-logs', { params })
    const { content, totalElements: te } = res.data.resultData
    all = all.concat(content)
    total = te
    if (!content.length) break // 안전장치: 서버가 totalElements를 못 믿을 상황 대비 무한루프 방지
    fetchPage++
  }
  logs.value = all
  totalElements.value = total
  selected.value = []
  page.value = 0
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
  page.value = 0
}
const filteredLogs = computed(() => {
  if (!appliedKeyword.value) return logs.value
  const kw = appliedKeyword.value.toLowerCase()
  return logs.value.filter((l) => targetName(l).toLowerCase().includes(kw) || actorName(l.actorUserId).toLowerCase().includes(kw))
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredLogs.value.length / PAGE_SIZE)))
const pageNumbers = computed(() => {
  const start = Math.floor(page.value / PAGE_WINDOW) * PAGE_WINDOW
  const end = Math.min(start + PAGE_WINDOW, totalPages.value)
  return Array.from({ length: end - start }, (_, i) => start + i)
})
const pagedLogs = computed(() => filteredLogs.value.slice(page.value * PAGE_SIZE, (page.value + 1) * PAGE_SIZE))
function goToPage(p) {
  if (p < 0 || p >= totalPages.value) return
  page.value = p
}

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
    <div style="display:flex;align-items:center;gap:10px;">
      <h2 style="margin:0;">설비 관리 이력</h2>
      <router-link class="btn" style="margin-left:auto;" to="/settings/facilities">설비관리로</router-link>
    </div>

    <div style="display:flex;gap:8px;margin:16px 0;align-items:center;flex-wrap:wrap;">
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
    <table v-else style="width:100%;border-collapse:collapse;table-layout:fixed;">
      <colgroup>
        <col style="width:36px;">
        <col style="width:22%;">
        <col style="width:9%;">
        <col style="width:12%;">
        <col style="width:9%;">
        <col>
        <col style="width:150px;">
      </colgroup>
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
        <tr v-for="log in pagedLogs" :key="log.auditId" style="border-bottom:1px solid var(--color-border);">
          <td style="padding:8px;"><input type="checkbox" v-model="selected" :value="log.auditId" /></td>
          <td style="padding:8px;overflow-wrap:break-word;">{{ targetName(log) }}</td>
          <td style="padding:8px;">{{ TARGET_TYPE_LABEL[log.targetType] ?? log.targetType }}</td>
          <td style="padding:8px;overflow-wrap:break-word;">{{ actorName(log.actorUserId) }}</td>
          <td style="padding:8px;">
            <span class="badge" :style="{ background: ACTION_COLOR[log.action] }">{{ ACTION_LABEL[log.action] ?? log.action }}</span>
          </td>
          <td style="padding:8px;font-size:12px;color:var(--color-text-muted);overflow-wrap:break-word;">{{ summarize(log) }}</td>
          <td style="padding:8px;">{{ formatDateTime(log.createdAt) }}</td>
        </tr>
        <tr v-if="!filteredLogs.length">
          <td colspan="7" style="padding:16px;text-align:center;color:var(--color-text-muted);">이력이 없습니다.</td>
        </tr>
      </tbody>
    </table>
    <p style="color:var(--color-text-muted);font-size:12px;margin:8px 0 0;">총 {{ filteredLogs.length }}건</p>
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
  </div>
</template>
