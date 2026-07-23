<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import httpRequester from '../utils/httpRequester'
import { useMonitoringStore } from '../stores/monitoring'

const router = useRouter()
const monitoring = useMonitoringStore()

const loading = ref(true)
const loadError = ref(false)

const STATUS_LABEL = { NORMAL: '정상', CAUTION: '주의', RISK: '위험', OFFLINE: '오프라인' }
const STATUS_COLOR = { NORMAL: 'var(--color-success)', CAUTION: 'var(--color-warning)', RISK: 'var(--color-danger)', OFFLINE: 'var(--color-offline)' }
const ALERT_STATUS_LABEL = { UNCONFIRMED: '미확인', CONFIRMED: '확인됨', RESOLVED: '조치됨' }
const ALERT_STATUS_COLOR = { UNCONFIRMED: 'var(--color-danger)', CONFIRMED: 'var(--color-warning)', RESOLVED: 'var(--color-success)' }

// 위험 팝업/WS 연결/panelGrid는 monitoring 스토어가 레이아웃 마운트 시점에 이미 소유(어느 화면에 있든
// 위험 감지가 되게 하려는 목적) — 이 화면은 스토어 값을 그대로 보여주고, 자기 전용 데이터(최근 알림)만 따로 관리
const panelGrid = computed(() => monitoring.panelGrid)
const counts = computed(() => ({
  total: monitoring.summary?.totalPanelCount ?? 0,
  normal: monitoring.summary?.normalPanelCount ?? 0,
  caution: monitoring.summary?.cautionPanelCount ?? 0,
  risk: monitoring.summary?.riskPanelCount ?? 0,
  offline: monitoring.summary?.offlinePanelCount ?? 0,
}))

// "최근 알림"(와이어프레임 S-002 "최신 발생순 4건 요약")은 DashboardSummaryRes에 없어서 별도 조회
const recentAlerts = ref([])
async function loadRecentAlerts() {
  try {
    const res = await httpRequester.get('/alerts', { params: { page: 0, size: 4 } })
    recentAlerts.value = res.data.resultData.content
  } catch (e) {
    // 부가 정보라 실패해도 대시보드 전체를 막지 않음
  }
}

async function loadSummary() {
  await monitoring.refresh()
  loadError.value = !monitoring.summary
}

onMounted(async () => {
  loading.value = true
  await Promise.all([loadSummary(), loadRecentAlerts()])
  loading.value = false
})

// WS/폴링으로 스토어가 갱신될 때마다 이 화면 전용 데이터(최근 알림)도 같이 새로고침
watch(() => monitoring.refreshedAt, loadRecentAlerts)

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

      <div>
        <h3 style="margin:0 0 12px;">장비 현황</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:10px;">
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
  </div>
</template>
