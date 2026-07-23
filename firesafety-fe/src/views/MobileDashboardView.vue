<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import httpRequester from '../utils/httpRequester'
import { useMonitoringStore } from '../stores/monitoring'

const router = useRouter()
const monitoring = useMonitoringStore()
const loading = ref(true)
const recentAlerts = ref([])

const STATUS_LABEL = { NORMAL: '정상', CAUTION: '주의', RISK: '위험', OFFLINE: '오프라인' }
const STATUS_COLOR = { NORMAL: 'var(--color-success)', CAUTION: 'var(--color-warning)', RISK: 'var(--color-danger)', OFFLINE: 'var(--color-offline)' }
const ALERT_STATUS_LABEL = { UNCONFIRMED: '미확인', CONFIRMED: '확인됨', RESOLVED: '조치됨' }
const ALERT_STATUS_COLOR = { UNCONFIRMED: 'var(--color-danger)', CONFIRMED: 'var(--color-warning)', RESOLVED: 'var(--color-success)' }

// 위험 팝업/WS 연결은 MobileLayout이 이미 소유(monitoring.start()) — 여기선 스토어 값만 그대로 씀
const counts = computed(() => ({
  total: monitoring.summary?.totalPanelCount ?? 0,
  normal: monitoring.summary?.normalPanelCount ?? 0,
  caution: monitoring.summary?.cautionPanelCount ?? 0,
  risk: monitoring.summary?.riskPanelCount ?? 0,
}))
const panelGrid = computed(() => monitoring.panelGrid)

async function loadRecentAlerts() {
  try {
    const res = await httpRequester.get('/alerts', { params: { page: 0, size: 4 } })
    recentAlerts.value = res.data.resultData.content
  } catch (e) {
    // 부가 정보라 실패해도 화면 전체를 막지 않음
  }
}

onMounted(async () => {
  loading.value = true
  await Promise.all([monitoring.refresh(), loadRecentAlerts()])
  loading.value = false
})

function goToAlert(alertId) {
  router.push(`/m/alerts?alertId=${alertId}`)
}
function goToPanel(panelId) {
  router.push(`/m/alerts?panelId=${panelId}`)
}
</script>

<template>
  <div class="page">
    <p v-if="loading" class="muted center">불러오는 중...</p>
    <template v-else>
      <section>
        <h3 class="section-title">현재 정보 확인</h3>
        <div class="stat-grid">
          <div class="stat-card neutral">
            <div class="stat-label">전체 장비</div>
            <div class="stat-value">{{ counts.total }}</div>
          </div>
          <div class="stat-card" style="background:var(--color-success);">
            <div class="stat-label">정상</div>
            <div class="stat-value">{{ counts.normal }}</div>
          </div>
          <div class="stat-card" style="background:var(--color-warning);">
            <div class="stat-label">주의</div>
            <div class="stat-value">{{ counts.caution }}</div>
          </div>
          <div class="stat-card" style="background:var(--color-danger);">
            <div class="stat-label">위험</div>
            <div class="stat-value">{{ counts.risk }}</div>
          </div>
        </div>
      </section>

      <section>
        <h3 class="section-title">최근 알림</h3>
        <div v-if="recentAlerts.length" class="alert-list">
          <div v-for="a in recentAlerts" :key="a.alertId" class="alert-row" @click="goToAlert(a.alertId)">
            <span class="badge" :style="{ background: ALERT_STATUS_COLOR[a.status] ?? 'var(--color-offline)' }">
              {{ ALERT_STATUS_LABEL[a.status] ?? a.status }}
            </span>
            <span class="alert-text">{{ a.panelName }} {{ a.type }}</span>
            <span class="alert-time">{{ a.triggeredAt?.slice(5, 16).replace('T', ' ') }}</span>
          </div>
        </div>
        <p v-else class="muted center">최근 알림이 없습니다.</p>
      </section>

      <section>
        <h3 class="section-title">장비 정보</h3>
        <div class="panel-grid">
          <div
            v-for="p in panelGrid" :key="p.panelId"
            class="panel-chip"
            :style="{ background: STATUS_COLOR[p.status] ?? 'var(--color-offline)' }"
            @click="goToPanel(p.panelId)"
          >
            <div class="panel-name">{{ p.name }}</div>
            <div class="panel-status">{{ STATUS_LABEL[p.status] ?? p.status }}</div>
          </div>
        </div>
        <p v-if="!panelGrid.length" class="muted center">등록된 장비가 없습니다.</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page { padding: 16px; padding-bottom: 28px; }
.muted { color: var(--color-text-muted); font-size: 13px; }
.center { text-align: center; }
section { margin-bottom: 24px; }
.section-title { font-size: 14px; margin: 0 0 10px; text-align: center; color: var(--color-text); }

.stat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.stat-card {
  border-radius: var(--radius-md);
  padding: 16px;
  text-align: center;
  color: #fff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, .06);
}
.stat-card.neutral { background: var(--color-surface); color: var(--color-text); border: 1px solid var(--color-border); box-shadow: none; }
.stat-label { font-size: 12px; opacity: .9; }
.stat-value { font-size: 26px; font-weight: 700; margin-top: 2px; }

.alert-list { display: flex; flex-direction: column; gap: 8px; }
.alert-row {
  display: flex; align-items: center; gap: 10px;
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); padding: 12px; cursor: pointer;
}
.alert-text { flex: 1; font-size: 13px; }
.alert-time { font-size: 11px; color: var(--color-text-muted); white-space: nowrap; }

.panel-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.panel-chip {
  border-radius: var(--radius-md); padding: 10px 4px; text-align: center; color: #fff; cursor: pointer;
  box-shadow: 0 2px 6px rgba(0, 0, 0, .08);
}
.panel-name { font-size: 11px; opacity: .9; }
.panel-status { font-size: 12px; font-weight: 700; margin-top: 2px; }
</style>
