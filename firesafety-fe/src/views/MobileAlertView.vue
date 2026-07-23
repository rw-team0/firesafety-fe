<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import httpRequester from '../utils/httpRequester'
import ConfirmModal from '../components/ConfirmModal.vue'

const route = useRoute()

const loading = ref(true)
const alerts = ref([])
const panelIdByName = ref({})
const typeFilter = ref('')
const statusFilter = ref('')

const STATUS_LABEL = { UNCONFIRMED: '미확인', CONFIRMED: '확인됨', RESOLVED: '조치됨' }
const STATUS_COLOR = { UNCONFIRMED: 'var(--color-danger)', CONFIRMED: 'var(--color-warning)', RESOLVED: 'var(--color-success)' }
const TYPE_LABEL = { ARC: '아크', OVERHEAT: '과열', LEAKAGE: '누설', OVERCURRENT: '과전류', HUMIDITY: '습도', GAS: '가스', FIRE: '불꽃', DOOR_OPEN: '도어열림', DEVICE_ERROR: '장비오류', COMM_LOST: '통신두절' }
const PANEL_STATUS_COLOR = { NORMAL: 'var(--color-success)', CAUTION: 'var(--color-warning)', RISK: 'var(--color-danger)', OFFLINE: 'var(--color-offline)' }

async function load() {
  loading.value = true
  const params = {}
  if (typeFilter.value) params.type = typeFilter.value
  if (statusFilter.value) params.status = statusFilter.value
  const res = await httpRequester.get('/alerts', { params: { ...params, page: 0, size: 20 } })
  alerts.value = res.data.resultData.content
  loading.value = false
}

async function loadPanels() {
  const res = await httpRequester.get('/panels')
  panelIdByName.value = Object.fromEntries(res.data.resultData.map((p) => [p.name, p.panelId]))
}

// ── 장비 상세 오버레이(전체전류/전압/전력/도어 + 환경 + 회로목록) + 선택된 경보 확인/조치 ──
const detail = ref(null) // PanelDetailRes
const detailLoading = ref(false)
const selectedAlert = ref(null)
const pendingAction = ref(null) // 'confirm' | 'resolve' | null

async function openPanel(panelName, alert) {
  const panelId = panelIdByName.value[panelName]
  if (!panelId) return
  selectedAlert.value = alert ?? null
  detailLoading.value = true
  const res = await httpRequester.get(`/panels/${panelId}`)
  detail.value = res.data.resultData
  detailLoading.value = false
}
function closeDetail() {
  detail.value = null
  selectedAlert.value = null
}

function circuitStyle(status) {
  if (!status || status === 'NORMAL') return {}
  return { background: PANEL_STATUS_COLOR[status] ?? 'var(--color-offline)', color: status === 'CAUTION' ? '#000' : '#fff' }
}
function onCircuitTap(circuit) {
  // 이 회로가 지금 보고 있는 경보의 대상이고, 아직 미확인 상태면 탭해서 바로 확인 처리할 수 있게 함
  if (selectedAlert.value?.circuitNo === circuit.channelNo && selectedAlert.value?.status === 'UNCONFIRMED') {
    pendingAction.value = 'confirm'
  }
}

async function runAction() {
  const action = pendingAction.value
  pendingAction.value = null
  await httpRequester.patch(`/alerts/${selectedAlert.value.alertId}/${action}`)
  selectedAlert.value.status = action === 'confirm' ? 'CONFIRMED' : 'RESOLVED'
  load()
}

onMounted(async () => {
  await Promise.all([load(), loadPanels()])
  // 대시보드에서 알림/장비를 탭해서 넘어온 경우 해당 상세를 바로 연다
  if (route.query.alertId) {
    const found = alerts.value.find((a) => String(a.alertId) === String(route.query.alertId))
    if (found) openPanel(found.panelName, found)
  } else if (route.query.panelId) {
    const name = Object.keys(panelIdByName.value).find((n) => String(panelIdByName.value[n]) === String(route.query.panelId))
    if (name) openPanel(name, null)
  }
})
</script>

<template>
  <div class="page">
    <div class="filter-row">
      <select v-model="typeFilter" class="field-input" @change="load">
        <option value="">전체 유형</option>
        <option v-for="(label, key) in TYPE_LABEL" :key="key" :value="key">{{ label }}</option>
      </select>
      <select v-model="statusFilter" class="field-input" @change="load">
        <option value="">전체 상태</option>
        <option v-for="(label, key) in STATUS_LABEL" :key="key" :value="key">{{ label }}</option>
      </select>
    </div>

    <p v-if="loading" class="muted center">불러오는 중...</p>
    <template v-else>
      <div v-if="alerts.length" class="alert-list">
        <div v-for="a in alerts" :key="a.alertId" class="alert-card" @click="openPanel(a.panelName, a)">
          <div class="alert-card-top">
            <span class="badge" :style="{ background: STATUS_COLOR[a.status] }">{{ STATUS_LABEL[a.status] ?? a.status }}</span>
            <span class="alert-panel">{{ a.panelName }}</span>
          </div>
          <div class="alert-card-bottom">
            <span>{{ TYPE_LABEL[a.type] ?? a.type }}{{ a.circuitNo != null ? ` · 채널 ${a.circuitNo}` : '' }}</span>
            <span class="alert-time">{{ a.triggeredAt?.slice(0, 16).replace('T', ' ') }}</span>
          </div>
        </div>
      </div>
      <p v-else class="muted center">알림 이력이 없습니다.</p>
    </template>

    <!-- 장비 상세 오버레이 -->
    <div v-if="detail || detailLoading" class="overlay" @click.self="closeDetail">
      <div class="sheet">
        <div class="sheet-header">
          <span>{{ detail?.name ?? '분전반 정보' }}</span>
          <button class="btn" @click="closeDetail">닫기</button>
        </div>

        <p v-if="detailLoading" class="muted center" style="padding:20px;">불러오는 중...</p>
        <div v-else class="sheet-body">
          <div v-if="selectedAlert" class="alert-banner">
            <span class="badge" :style="{ background: STATUS_COLOR[selectedAlert.status] }">{{ STATUS_LABEL[selectedAlert.status] ?? selectedAlert.status }}</span>
            <span style="flex:1;">{{ TYPE_LABEL[selectedAlert.type] ?? selectedAlert.type }} 경보</span>
            <button v-if="selectedAlert.status === 'UNCONFIRMED'" class="btn btn-primary" @click="pendingAction = 'confirm'">확인 처리</button>
            <button v-else-if="selectedAlert.status === 'CONFIRMED'" class="btn btn-primary" @click="pendingAction = 'resolve'">조치 완료</button>
          </div>

          <div class="mini-grid">
            <div class="mini-card"><div class="mini-label">전체전류</div><div class="mini-value">{{ detail.totalCurrent != null ? detail.totalCurrent + 'A' : '-' }}</div></div>
            <div class="mini-card"><div class="mini-label">전압</div><div class="mini-value">{{ detail.voltV != null ? detail.voltV + 'V' : '-' }}</div></div>
            <div class="mini-card"><div class="mini-label">전체전력</div><div class="mini-value">{{ detail.totalPower != null ? detail.totalPower + 'W' : '-' }}</div></div>
            <div class="mini-card"><div class="mini-label">도어</div><div class="mini-value">{{ detail.doorStatus == null ? '-' : (detail.doorStatus ? '열림' : '닫힘') }}</div></div>
          </div>

          <h4 class="sheet-section-title">회로 목록</h4>
          <div class="circuit-grid">
            <div v-for="c in detail.circuits" :key="c.circuitId" class="circuit-chip" :style="circuitStyle(c.status)" @click="onCircuitTap(c)">
              <div style="font-weight:700;">회로 {{ c.channelNo }}</div>
              <div style="font-size:11px;opacity:.85;">아크 {{ c.arcCounter ?? 0 }}회</div>
            </div>
          </div>

          <h4 class="sheet-section-title">환경</h4>
          <div class="mini-grid">
            <div class="mini-card"><div class="mini-label">온도</div><div class="mini-value">{{ detail.temperature != null ? detail.temperature + '°C' : '-' }}</div></div>
            <div class="mini-card"><div class="mini-label">습도</div><div class="mini-value">{{ detail.humidity != null ? detail.humidity + '%' : '-' }}</div></div>
            <div class="mini-card"><div class="mini-label">불꽃센서</div><div class="mini-value">{{ detail.fireRaw ?? '-' }}</div></div>
            <div class="mini-card"><div class="mini-label">가스센서</div><div class="mini-value">{{ detail.gasRaw ?? '-' }}</div></div>
          </div>
        </div>
      </div>
    </div>

    <ConfirmModal v-if="pendingAction" title="경보 처리"
      :message="`이 경보를 ${pendingAction === 'confirm' ? '확인 처리' : '조치 완료'}하시겠습니까?`"
      @confirm="runAction" @cancel="pendingAction = null" />
  </div>
</template>

<style scoped>
.page { padding: 16px; padding-bottom: 28px; }
.muted { color: var(--color-text-muted); font-size: 13px; }
.center { text-align: center; }

.filter-row { display: flex; gap: 8px; margin-bottom: 16px; }
.filter-row .field-input { margin-bottom: 0; flex: 1; }

.alert-list { display: flex; flex-direction: column; gap: 8px; }
.alert-card {
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); padding: 12px; cursor: pointer;
}
.alert-card-top { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.alert-panel { font-weight: 700; font-size: 13px; }
.alert-card-bottom { display: flex; justify-content: space-between; font-size: 12px; color: var(--color-text-muted); }
.alert-time { white-space: nowrap; }

.overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, .45);
  display: flex; align-items: flex-end; z-index: 50; /* ConfirmModal(.modal-overlay z-index:100)이 이 시트보다 위에 뜨게 함 */
}
.sheet {
  width: 100%; max-height: 88vh; overflow-y: auto;
  background: var(--color-surface); border-radius: 16px 16px 0 0;
  animation: slide-up .18s ease-out;
}
@keyframes slide-up { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.sheet-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px; font-weight: 700; border-bottom: 1px solid var(--color-border);
  position: sticky; top: 0; background: var(--color-surface);
}
.sheet-body { padding: 16px; }
.sheet-section-title { font-size: 13px; margin: 18px 0 10px; }

.alert-banner {
  display: flex; align-items: center; gap: 8px;
  background: var(--color-bg); border-radius: var(--radius-md); padding: 10px 12px; margin-bottom: 16px;
  font-size: 13px;
}

.mini-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.mini-card { border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 10px; }
.mini-label { font-size: 11px; color: var(--color-text-muted); }
.mini-value { font-size: 15px; font-weight: 700; margin-top: 2px; }

.circuit-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.circuit-chip {
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  padding: 10px; text-align: center; font-size: 12px; cursor: pointer;
}
</style>
