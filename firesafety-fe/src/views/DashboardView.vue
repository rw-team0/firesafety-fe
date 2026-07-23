<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import httpRequester from '../utils/httpRequester'
import { createMonitoringSocket } from '../utils/monitoringSocket'
import { useMonitoringStore } from '../stores/monitoring'

const router = useRouter()
const monitoring = useMonitoringStore()

const loading = ref(true)
const loadError = ref(false)
const panelGrid = ref([])
const recentAlerts = ref([])
const riskPopup = ref(null)
let socket = null
let pollTimer = null

const STATUS_LABEL = { NORMAL: '정상', CAUTION: '주의', RISK: '위험', OFFLINE: '오프라인' }
const STATUS_COLOR = { NORMAL: 'var(--color-success)', CAUTION: 'var(--color-warning)', RISK: 'var(--color-danger)', OFFLINE: 'var(--color-offline)' }

const counts = computed(() => ({
  total: panelGrid.value.length,
  normal: panelGrid.value.filter(p => p.status === 'NORMAL').length,
  caution: panelGrid.value.filter(p => p.status === 'CAUTION').length,
  risk: panelGrid.value.filter(p => p.status === 'RISK').length,
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
    const res = await httpRequester.get('/dashboard/summary') // API-018
    const data = res.data.resultData
    panelGrid.value = data.panelGrid ?? []
    recentAlerts.value = data.recentAlerts ?? []
    monitoring.setUnreadAlertCount(recentAlerts.value.filter(a => a.status === 'UNCONFIRMED').length)
    loadError.value = false
  } catch (e) {
    // 실패 알림은 인터셉터가 이미 띄웠음 — 여기선 화면이 "불러오는 중"에 멈춰있지 않도록 상태만 정리
    loadError.value = true
  }
}

// WS 메시지 형태는 API-019에 명시된 { panelId, circuitId, status, ... } 정도만 확인됨(가정 포함) —
// 정확한 필드가 다르면 이 핸들러만 고치면 됨
function handleWsMessage(evt) {
  if (evt?.panelId == null || !evt?.status) return
  const panel = panelGrid.value.find(p => p.panelId === evt.panelId)
  if (panel) panel.status = evt.status
  if (evt.status === 'RISK') {
    riskPopup.value = { panelId: evt.panelId, panelName: panel?.name ?? `분전반 #${evt.panelId}` }
    monitoring.setUnreadAlertCount(monitoring.unreadAlertCount + 1)
    playAlertBeep()
  }
}

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(loadSummary, 15000) // NFR-14: WS 끊기면 REST 폴링으로 전환
}
function stopPolling() {
  clearInterval(pollTimer)
  pollTimer = null
}

onMounted(async () => {
  loading.value = true
  await loadSummary()
  loading.value = false

  socket = createMonitoringSocket({
    onMessage: handleWsMessage,
    onConnect: () => { monitoring.setWsConnected(true); stopPolling() },
    onDisconnect: () => { monitoring.setWsConnected(false); startPolling() },
  })
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
      <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
        <div class="card" style="padding:14px 20px;">
          <div style="font-size:12px;color:var(--color-text-muted);">전체 장비</div>
          <div style="font-size:28px;font-weight:700;">{{ counts.total }}</div>
        </div>
        <div style="border-radius:8px;padding:14px 20px;background:var(--color-success);color:#fff;">
          <div style="font-size:12px;">정상</div>
          <div style="font-size:28px;font-weight:700;">{{ counts.normal }}</div>
        </div>
        <div style="border-radius:8px;padding:14px 20px;background:var(--color-warning);color:#fff;">
          <div style="font-size:12px;">주의</div>
          <div style="font-size:28px;font-weight:700;">{{ counts.caution }}</div>
        </div>
        <div style="border-radius:8px;padding:14px 20px;background:var(--color-danger);color:#fff;">
          <div style="font-size:12px;">위험</div>
          <div style="font-size:28px;font-weight:700;">{{ counts.risk }}</div>
        </div>
      </div>

      <h3>최근 알림</h3>
      <div style="margin-bottom:24px;">
        <div
          v-for="a in recentAlerts"
          :key="a.alertId"
          class="card"
          style="display:flex;align-items:center;gap:12px;padding:10px 12px;margin-bottom:6px;cursor:pointer;"
          @click="goToAlert(a.alertId)"
        >
          <span class="badge" :style="{ background: STATUS_COLOR[a.status] ?? 'var(--color-offline)' }">
            {{ STATUS_LABEL[a.status] ?? a.status }}
          </span>
          <span style="flex:1;">{{ a.panelName }} {{ a.type }}</span>
          <span style="font-size:11px;color:var(--color-text-muted);">{{ a.triggeredAt }}</span>
        </div>
        <p v-if="!recentAlerts.length" style="color:var(--color-text-muted);">최근 알림이 없습니다.</p>
      </div>

      <h3>장비 현황</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;">
        <div
          v-for="p in panelGrid"
          :key="p.panelId"
          @click="goToPanel(p.panelId)"
          :style="{ background: STATUS_COLOR[p.status] ?? 'var(--color-offline)', color:'#fff', borderRadius:'6px', padding:'10px', cursor:'pointer', textAlign:'center' }"
        >
          <div style="font-size:12px;">{{ p.name }}</div>
          <div style="font-size:13px;font-weight:700;">{{ STATUS_LABEL[p.status] ?? p.status }}</div>
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
            <button class="btn" @click="riskPopup=null">닫기</button>
            <button class="btn btn-primary" @click="goToPanel(riskPopup.panelId); riskPopup=null">상세보기</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
