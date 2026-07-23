<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import httpRequester from '../utils/httpRequester'
import { createMonitoringSocket } from '../utils/monitoringSocket'
import { useMonitoringStore } from '../stores/monitoring'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const monitoring = useMonitoringStore()
const auth = useAuthStore()

const loading = ref(true)
const loadError = ref(false)
const summary = ref(null) // DashboardSummaryRes 전체 보관(카운트 필드 직접 사용)
const panelGrid = ref([])
const riskPopup = ref(null)
let socket = null
let pollTimer = null

const STATUS_LABEL = { NORMAL: '정상', CAUTION: '주의', RISK: '위험', OFFLINE: '오프라인' }
const STATUS_COLOR = { NORMAL: 'var(--color-success)', CAUTION: 'var(--color-warning)', RISK: 'var(--color-danger)', OFFLINE: 'var(--color-offline)' }
const ALERT_STATUS_LABEL = { UNCONFIRMED: '미확인', CONFIRMED: '확인됨', RESOLVED: '조치됨' }
const ALERT_STATUS_COLOR = { UNCONFIRMED: 'var(--color-danger)', CONFIRMED: 'var(--color-warning)', RESOLVED: 'var(--color-success)' }

// 실제 백엔드 Swagger(DashboardSummaryRes, 2026-07-23 확인) 결과: total/normal/caution/risk/offlinePanelCount와
// unconfirmedAlertCount/unresolvedAlertCount를 서버가 직접 집계해서 내려줌 — panelGrid에서 클라이언트가
// 다시 계산할 필요 없음(offline 카운트도 새로 추가됨). "최근 알림"(와이어프레임 S-002 "최신 발생순 4~5건 요약")은
// DashboardSummaryRes에 없지만 GET /alerts는 있어서, 별도로 최근 5건을 조회해 옴(정렬은 서버 기본값에 의존)
const recentAlerts = ref([])
const counts = computed(() => ({
  total: summary.value?.totalPanelCount ?? 0,
  normal: summary.value?.normalPanelCount ?? 0,
  caution: summary.value?.cautionPanelCount ?? 0,
  risk: summary.value?.riskPanelCount ?? 0,
  offline: summary.value?.offlinePanelCount ?? 0,
}))

// 웹은 팝업+경보음(프론트가이드 7.5절). 별도 오디오 파일 없이 Web Audio로 짧은 비프음만 재생 —
// 브라우저 자동재생 정책 때문에 실패할 수 있어 방어적으로 감싸둠
function playAlertBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    osc.frequency.value = 880
    osc.connect(ctx.destination)
    osc.start()
    setTimeout(() => { osc.stop(); ctx.close() }, 200)
  } catch (e) {
    // 자동재생 차단 등은 무시 — 팝업 자체는 뜨니 치명적이지 않음
  }
}

async function loadSummary() {
  try {
    const res = await httpRequester.get('/dashboard/summary', { params: {} }) // DashboardSummaryReq: siteId 선택
    const data = res.data.resultData
    summary.value = data
    panelGrid.value = data.panels ?? []
    monitoring.setUnreadAlertCount(data.unconfirmedAlertCount ?? 0)
    loadError.value = false
  } catch (e) {
    // 실패 알림은 인터셉터가 이미 띄웠음 — 여기선 화면이 "불러오는 중"에 멈춰있지 않도록 상태만 정리
    loadError.value = true
  }
}

async function loadRecentAlerts() {
  try {
    const res = await httpRequester.get('/alerts', { params: { page: 0, size: 5 } })
    recentAlerts.value = res.data.resultData.content
  } catch (e) {
    // 부가 정보라 실패해도 대시보드 전체를 막지 않음
  }
}

async function refresh() {
  await Promise.all([loadSummary(), loadRecentAlerts()])
}

// 백엔드팀 API 가이드(2026-07-23) 확인 결과: WS 메시지엔 panelId/status 같은 상세 데이터가 없고
// { eventType, occurredAt } 새로고침 신호만 옴 — 받으면 REST로 다시 조회해서 비교, 새로 RISK가 된
// 분전반이 있으면 팝업을 띄움(패치할 상세 payload 자체가 없어서 재조회 기반으로 재설계함)
async function handleWsMessage() {
  const previousRiskIds = new Set(panelGrid.value.filter(p => p.status === 'RISK').map(p => p.panelId))
  await refresh()
  const newRisk = panelGrid.value.find(p => p.status === 'RISK' && !previousRiskIds.has(p.panelId))
  if (newRisk) {
    riskPopup.value = { panelId: newRisk.panelId, panelName: newRisk.name }
    playAlertBeep()
  }
}

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(refresh, 15000) // NFR-14: WS 끊기면(또는 애초에 미사용이면) REST 폴링으로 전환
}
function stopPolling() {
  clearInterval(pollTimer)
  pollTimer = null
}

onMounted(async () => {
  loading.value = true
  await refresh()
  loading.value = false

  // API 가이드 6절: SUPER_ADMIN은 이 topic을 쓰지 않음(REST 전체조회로만 동작) — 폴링만 사용.
  // ADMIN/GENERAL은 본인 담당 현장 topic(들)을 구독
  if (auth.role === 'SUPER_ADMIN') {
    monitoring.setWsConnected(true) // SUPER_ADMIN은 설계상 WS 미사용 — 폴링이 정상 동작 중이면 "통신두절"로 보이면 안 됨
    startPolling()
    return
  }
  // site-assignments는 ADMIN 이상만 호출 가능한 관리용 API라 GENERAL이 부르면 403.
  // 본인 담당 현장만 필요하면 되므로 이미 역할별로 스코프되는 /sites를 사용한다.
  const sitesRes = await httpRequester.get('/sites')
  const siteIds = sitesRes.data.resultData.map(s => s.siteId)
  socket = createMonitoringSocket({
    siteIds,
    onMessage: handleWsMessage,
    onConnect: () => { monitoring.setWsConnected(true); stopPolling() },
    onDisconnect: () => { monitoring.setWsConnected(false); startPolling() },
  })
  if (!siteIds.length) startPolling() // 담당 현장이 없으면 구독할 topic도 없음 — 폴링으로만 동작
})
onBeforeUnmount(() => {
  socket?.deactivate()
  stopPolling()
})

function goToPanel(panelId) {
  router.push(`/equipment/${panelId}`)
}
function goToAlert(alertId) {
  router.push(`/alerts?alertId=${alertId}`)
}
</script>

<template>
  <div>
    <h2 style="margin-top:0;">대시보드</h2>

    <div v-if="loading" style="color:var(--color-text-muted);">불러오는 중...</div>
    <div v-else-if="loadError" class="banner banner-danger">
      대시보드 데이터를 불러오지 못했습니다.
      <button class="btn" style="margin-left:8px;" @click="loadSummary">다시 시도</button>
    </div>
    <template v-else>
      <h3>전체 현황</h3>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:28px;">
        <div class="card" style="padding:14px 20px;text-align:center;">
          <div style="font-size:12px;color:var(--color-text-muted);">전체 장비</div>
          <div style="font-size:28px;font-weight:700;">{{ counts.total }}</div>
        </div>
        <div style="border-radius:8px;padding:14px 20px;background:var(--color-success);color:#fff;text-align:center;">
          <div style="font-size:12px;">정상</div>
          <div style="font-size:28px;font-weight:700;">{{ counts.normal }}</div>
        </div>
        <div style="border-radius:8px;padding:14px 20px;background:var(--color-warning);color:#fff;text-align:center;">
          <div style="font-size:12px;">주의</div>
          <div style="font-size:28px;font-weight:700;">{{ counts.caution }}</div>
        </div>
        <div style="border-radius:8px;padding:14px 20px;background:var(--color-danger);color:#fff;text-align:center;">
          <div style="font-size:12px;">위험</div>
          <div style="font-size:28px;font-weight:700;">{{ counts.risk }}</div>
        </div>
      </div>

      <h3>최근 알림</h3>
      <div style="margin-bottom:28px;">
        <div
          v-for="a in recentAlerts"
          :key="a.alertId"
          class="card"
          style="display:flex;align-items:center;gap:12px;padding:10px 12px;margin-bottom:6px;cursor:pointer;"
          @click="goToAlert(a.alertId)"
        >
          <span class="badge" :style="{ background: ALERT_STATUS_COLOR[a.status] ?? 'var(--color-offline)' }">
            {{ ALERT_STATUS_LABEL[a.status] ?? a.status }}
          </span>
          <span style="flex:1;">{{ a.panelName }} {{ a.type }}</span>
          <span style="font-size:11px;color:var(--color-text-muted);">{{ a.triggeredAt }}</span>
          <button class="btn" @click.stop="goToAlert(a.alertId)">상세조회</button>
        </div>
        <p v-if="!recentAlerts.length" style="color:var(--color-text-muted);">최근 알림이 없습니다.</p>
      </div>

      <div style="display:flex;gap:16px;align-items:center;">
        <h3 style="width:80px;flex:none;margin:0;">장비 현황</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;flex:1;">
          <div
            v-for="p in panelGrid"
            :key="p.panelId"
            @click="goToPanel(p.panelId)"
            :style="{ background: STATUS_COLOR[p.status] ?? 'var(--color-offline)', color:'#fff', borderRadius:'6px', padding:'10px', cursor:'pointer', textAlign:'center', position:'relative' }"
          >
            <span v-if="p.unconfirmedAlertCount" class="badge" style="position:absolute;top:-6px;right:-6px;background:var(--color-danger);">{{ p.unconfirmedAlertCount }}</span>
            <div style="font-size:11px;color:rgba(255,255,255,.85);">{{ p.siteName }}</div>
            <div style="font-size:12px;">{{ p.name }}</div>
            <div style="font-size:13px;font-weight:700;">{{ STATUS_LABEL[p.status] ?? p.status }}</div>
          </div>
        </div>
      </div>
    </template>

    <!-- 위험 등급 전환 팝업(프론트가이드 7.5절) -->
    <div v-if="riskPopup" class="modal-overlay" @click.self="riskPopup=null">
      <div class="modal-panel">
        <div class="modal-header danger">위험 발생</div>
        <div class="modal-body">
          <p>{{ riskPopup.panelName }}에서 위험 상태가 감지되었습니다.</p>
          <div class="modal-actions">
            <button class="btn btn-primary" @click="goToPanel(riskPopup.panelId); riskPopup=null">상세보기</button>
            <button class="btn" @click="riskPopup=null">닫기</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
