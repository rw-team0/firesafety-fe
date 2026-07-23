<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRoute } from 'vue-router'
import httpRequester from '../utils/httpRequester'
import { createMonitoringSocket } from '../utils/monitoringSocket'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const auth = useAuthStore()
const panelId = route.params.panelId // 고정값으로 한 번만 읽는다 — WS/폴링 콜백이 매번 route를 다시 읽으면
// 다른 페이지로 이동한 뒤 뒤늦게 도착한 메시지가 그 시점의(이미 사라진) params를 읽어 /panels/undefined를 호출하게 됨
const panel = ref(null)
const siteName = ref('-')
const loading = ref(true)
let socket = null
let pollTimer = null
let active = true // 언마운트 후 뒤늦게 도착한 콜백이 API를 호출/상태를 갱신하지 않도록 막는 가드

// 실제 백엔드 GET /api/panels/{panelId} (2026-07-24 확장) 기준: 최신 전류/전압/전력/도어/온습도/가스·불꽃
// raw값과 회로별 상태(circuits), 최근 경보(recentAlerts)까지 한 번에 내려옴 — 회로별 status는
// 백엔드 PanelService.resolveCircuitStatus 매트릭스로 이미 계산되어 오므로 프론트는 그대로 표시만 한다.
const STATUS_LABEL = { NORMAL: '정상', CAUTION: '주의', RISK: '위험', OFFLINE: '오프라인' }
const STATUS_COLOR = { NORMAL: 'var(--color-success)', CAUTION: 'var(--color-warning)', RISK: 'var(--color-danger)', OFFLINE: 'var(--color-offline)' }

function circuitCardStyle(status) {
  if (!status || status === 'NORMAL') return {}
  return { background: STATUS_COLOR[status] ?? 'var(--color-offline)', color: status === 'CAUTION' ? '#000' : '#fff', borderColor: 'transparent' }
}

// 항목별 raw값 vs 서버 주의 임계값 직접 비교(프론트 계산). 백엔드의 "30초 지속" 공식 CAUTION 판정과는
// 별개라 순간적으로 안 맞을 수 있음 — 그래도 각 카드에서 뭐가 임계치를 넘었는지 바로 보여주려고 추가함
function thresholdCardStyle(value, threshold) {
  if (value == null || threshold == null || Number(value) < Number(threshold)) return {}
  return { background: 'var(--color-warning)', color: '#000', borderColor: 'transparent' }
}

function doorCardStyle(doorStatus) {
  if (!doorStatus) return {}
  return { background: 'var(--color-danger)', color: '#fff', borderColor: 'transparent' }
}

async function load() {
  if (!active) return
  const [panelRes, sitesRes] = await Promise.all([
    httpRequester.get(`/panels/${panelId}`),
    httpRequester.get('/sites'),
  ])
  if (!active) return
  panel.value = panelRes.data.resultData
  siteName.value = sitesRes.data.resultData.find(s => s.siteId === panel.value.siteId)?.name ?? '-'
}

function startPolling() {
  if (pollTimer) return
  pollTimer = setInterval(load, 5000)
}
function stopPolling() {
  clearInterval(pollTimer)
  pollTimer = null
}

onMounted(async () => {
  loading.value = true
  await load()
  loading.value = false

  // 대시보드와 동일한 원칙: SUPER_ADMIN은 이 topic을 안 써서 폴링만, ADMIN/GENERAL은 소속 현장 topic 구독
  if (auth.role === 'SUPER_ADMIN') {
    startPolling()
    return
  }
  socket = createMonitoringSocket({
    siteIds: [panel.value.siteId],
    onMessage: load,
    onConnect: stopPolling,
    onDisconnect: startPolling,
  })
})
onBeforeUnmount(() => {
  active = false
  socket?.deactivate()
  stopPolling()
})
</script>

<template>
  <div v-if="loading">불러오는 중...</div>
  <div v-else-if="panel">
    <h2 style="margin-top:0;">장비/회로 상세</h2>

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
      <span style="font-size:18px;font-weight:700;">{{ panel.name }}</span>
      <span class="badge" :style="{ background: STATUS_COLOR[panel.status] }">{{ STATUS_LABEL[panel.status] ?? panel.status }}</span>
      <span style="font-size:12px;color:var(--color-text-muted);">{{ panel.isOnline ? '통신 정상' : '통신두절' }} · 최근 통신 {{ panel.lastCommunicatedAt ?? '-' }}</span>
    </div>

    <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:center;padding:8px 14px;border:1px solid var(--color-border);border-radius:8px;font-size:13px;">
      <span><span style="color:var(--color-text-muted);">소속 현장</span> {{ siteName }}</span>
      <span><span style="color:var(--color-text-muted);">일련번호</span> {{ panel.deviceSerial }}</span>
      <span><span style="color:var(--color-text-muted);">장비번호</span> {{ panel.mNo || '-' }}</span>
      <span><span style="color:var(--color-text-muted);">설치일</span> {{ panel.installedAt || '-' }}</span>
      <span><span style="color:var(--color-text-muted);">회로 개수</span> {{ panel.circuitCount }}</span>
    </div>

    <div style="display:flex;align-items:baseline;gap:8px;">
      <h3 style="margin-bottom:8px;">주의 임계값</h3>
      <span style="font-size:12px;color:var(--color-text-muted);">값 수정은 설비 관리 &gt; 분전반 관리에서 할 수 있습니다.</span>
    </div>
    <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:center;padding:8px 14px;border:1px solid var(--color-border);border-radius:8px;margin-bottom:24px;font-size:13px;">
      <span><span style="color:var(--color-text-muted);">zct 누설전류</span> {{ panel.leakMaThreshold ?? '-' }} mA</span>
      <span><span style="color:var(--color-text-muted);">온도</span> {{ panel.tempThreshold ?? '-' }} 도</span>
      <span><span style="color:var(--color-text-muted);">습도</span> {{ panel.humidityThreshold ?? '-' }} %</span>
      <span><span style="color:var(--color-text-muted);">과전류</span> {{ panel.overcurrentThreshold ?? '-' }} A</span>
      <span><span style="color:var(--color-text-muted);">가스</span> {{ panel.gasThreshold ?? '-' }}</span>
      <span><span style="color:var(--color-text-muted);">불꽃</span> {{ panel.fireThreshold ?? '-' }}</span>
    </div>

    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px;">
      <div class="card" :style="{ padding: '12px 14px', height: '87px', boxSizing: 'border-box', ...thresholdCardStyle(panel.totalCurrent, panel.overcurrentThreshold) }">
        <div style="font-size:12px;color:var(--color-text-muted);">전체전류</div>
        <div style="font-size:16px;font-weight:700;">{{ panel.totalCurrent != null ? panel.totalCurrent + 'A' : '-' }}</div>
      </div>
      <div class="card" style="padding:12px 14px;height:87px;box-sizing:border-box;">
        <div style="font-size:12px;color:var(--color-text-muted);">전압</div>
        <div style="font-size:16px;font-weight:700;">{{ panel.voltV != null ? panel.voltV + 'V' : '-' }}</div>
      </div>
      <div class="card" style="padding:12px 14px;height:87px;box-sizing:border-box;">
        <div style="font-size:12px;color:var(--color-text-muted);">전체전력</div>
        <div style="font-size:16px;font-weight:700;">{{ panel.totalPower != null ? panel.totalPower + 'W' : '-' }}</div>
      </div>
      <div class="card" :style="{ padding: '12px 14px', height: '87px', boxSizing: 'border-box', ...doorCardStyle(panel.doorStatus) }">
        <div style="font-size:12px;color:var(--color-text-muted);">도어</div>
        <div style="font-size:16px;font-weight:700;">{{ panel.doorStatus == null ? '-' : (panel.doorStatus ? '열림' : '닫힘') }}</div>
      </div>
    </div>

    <h3>회로 목록</h3>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:24px;">
      <div v-for="c in panel.circuits" :key="c.circuitId" class="card" :style="{ padding: '12px 14px', height: '87px', boxSizing: 'border-box', ...circuitCardStyle(c.status) }">
        <div style="font-weight:700;">회로 {{ c.channelNo }}</div>
        <div style="font-size:15px;font-weight:700;">{{ c.currentA != null ? c.currentA + 'A' : '-' }}</div>
        <div style="font-size:11px;opacity:.85;">아크 {{ c.arcCounter ?? 0 }}회</div>
      </div>
      <p v-if="!panel.circuits?.length" style="color:var(--color-text-muted);">등록된 회로가 없습니다.</p>
    </div>

    <h3>환경</h3>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;">
      <div class="card" :style="{ padding: '12px 14px', height: '87px', boxSizing: 'border-box', ...thresholdCardStyle(panel.temperature, panel.tempThreshold) }">
        <div style="font-size:12px;color:var(--color-text-muted);">온도</div>
        <div style="font-size:16px;font-weight:700;">{{ panel.temperature != null ? panel.temperature + '°C' : '-' }}</div>
      </div>
      <div class="card" :style="{ padding: '12px 14px', height: '87px', boxSizing: 'border-box', ...thresholdCardStyle(panel.humidity, panel.humidityThreshold) }">
        <div style="font-size:12px;color:var(--color-text-muted);">습도</div>
        <div style="font-size:16px;font-weight:700;">{{ panel.humidity != null ? panel.humidity + '%' : '-' }}</div>
      </div>
      <div class="card" :style="{ padding: '12px 14px', height: '87px', boxSizing: 'border-box', ...thresholdCardStyle(panel.fireRaw, panel.fireThreshold) }">
        <div style="font-size:12px;color:var(--color-text-muted);">불꽃센서</div>
        <div style="font-size:16px;font-weight:700;">{{ panel.fireRaw ?? '-' }}</div>
      </div>
      <div class="card" :style="{ padding: '12px 14px', height: '87px', boxSizing: 'border-box', ...thresholdCardStyle(panel.gasRaw, panel.gasThreshold) }">
        <div style="font-size:12px;color:var(--color-text-muted);">가스센서</div>
        <div style="font-size:16px;font-weight:700;">{{ panel.gasRaw ?? '-' }}</div>
      </div>
    </div>
  </div>
</template>
