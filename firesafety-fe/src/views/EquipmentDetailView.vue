<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import httpRequester from '../utils/httpRequester'

const route = useRoute()
const panel = ref(null)
const siteName = ref('-')
const circuits = ref([]) // 각 항목에 최신 AI 진단결과(diagnosis)를 붙여서 보관
const recentAlerts = ref([])
const loading = ref(true)

// 실제 백엔드 Swagger(192.168.0.31:8080/swagger-ui, 2026-07-23 확인) 결과:
// PanelDetailRes엔 전류/전압/전력/도어/온습도/가스·화재 raw값이 전혀 없고(실시간 텔레메트리는 REST로 노출 안 됨),
// 대신 서버 주의(CAUTION) 임계값 6종(leakMaThreshold 등)과 상태/통신정보만 내려옴.
// 회로도 currentA/아크횟수 같은 필드가 없고, AI 판정은 별도 GET /circuits/{id}/diagnosis에서
// 이진분류(NORMAL/ARC) 이력으로만 제공됨 — 와이어프레임의 전체전류/전압/전력/도어/환경센서/회로별 전류값·아크횟수는
// 실제 API에 없는 값이라 반영하지 않았고, 대신 회로 타일 색상을 최신 AI 판정으로 표시함
const STATUS_LABEL = { NORMAL: '정상', CAUTION: '주의', RISK: '위험', OFFLINE: '오프라인' }
const STATUS_COLOR = { NORMAL: 'var(--color-success)', CAUTION: 'var(--color-warning)', RISK: 'var(--color-danger)', OFFLINE: 'var(--color-offline)' }
const VERDICT_LABEL = { NORMAL: '정상', ARC: '아크' }
const ALERT_STATUS_LABEL = { UNCONFIRMED: '미확인', CONFIRMED: '확인됨', RESOLVED: '조치됨' }
const ALERT_STATUS_COLOR = { UNCONFIRMED: 'var(--color-danger)', CONFIRMED: 'var(--color-warning)', RESOLVED: 'var(--color-success)' }

function formatDateTime(v) {
  return v ? v.replace('T', ' ') : '-'
}
function formatRelative(iso) {
  if (!iso) return '-'
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (sec < 60) return `${Math.max(sec, 0)}초 전`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}분 전`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}시간 전`
  return `${Math.floor(hour / 24)}일 전`
}
function slotColor(c) {
  if (!c.latestDiagnosis) return 'var(--color-offline)'
  return c.latestDiagnosis.verdict === 'ARC' ? 'var(--color-danger)' : '#fff'
}
function slotTextColor(c) {
  return (!c.latestDiagnosis || c.latestDiagnosis.verdict === 'ARC') ? '#fff' : 'var(--color-text)'
}

async function load() {
  loading.value = true
  const panelId = route.params.panelId
  const [panelRes, sitesRes, circuitsRes] = await Promise.all([
    httpRequester.get(`/panels/${panelId}`),
    httpRequester.get('/sites'),
    httpRequester.get(`/panels/${panelId}/circuits`),
  ])
  panel.value = panelRes.data.resultData
  siteName.value = sitesRes.data.resultData.find(s => s.siteId === panel.value.siteId)?.name ?? '-'

  circuits.value = await Promise.all(circuitsRes.data.resultData.map(async (c) => {
    const diagRes = await httpRequester.get(`/circuits/${c.circuitId}/diagnosis`, { params: { page: 0, size: 1 } })
    const latest = diagRes.data.resultData.content?.[0] ?? null
    return { ...c, latestDiagnosis: latest }
  }))

  // 이 분전반의 최근 알림 — AlertListReq엔 panelId 필터가 없어서(siteId만 지원, Swagger 확인)
  // 같은 현장 알림을 가져와 panelName으로 클라이언트에서 필터링
  const alertsRes = await httpRequester.get('/alerts', { params: { siteId: panel.value.siteId, size: 20 } })
  recentAlerts.value = alertsRes.data.resultData.content
    .filter((a) => a.panelName === panel.value.name)
    .slice(0, 5)

  loading.value = false
}
onMounted(load)

// ── 임계값 설정(수정) — 설비관리 > 분전반관리 목록의 "수정" 기능이 여기로 이관됨 ──
const showEditModal = ref(false)
const editForm = ref({})
const editSubmitting = ref(false)
const editErrorMsg = ref('')

function openEdit() {
  editForm.value = {
    name: panel.value.name, deviceSerial: panel.value.deviceSerial, installedAt: panel.value.installedAt ?? '',
    circuitCount: panel.value.circuitCount, mNo: panel.value.mNo ?? '',
    leakMaThreshold: panel.value.leakMaThreshold, tempThreshold: panel.value.tempThreshold,
    humidityThreshold: panel.value.humidityThreshold, overcurrentThreshold: panel.value.overcurrentThreshold,
    gasThreshold: panel.value.gasThreshold, fireThreshold: panel.value.fireThreshold,
  }
  editErrorMsg.value = ''
  showEditModal.value = true
}
async function saveEdit() {
  editErrorMsg.value = ''
  if (!editForm.value.name || !editForm.value.deviceSerial) {
    editErrorMsg.value = '분전반명/일련번호를 입력해주세요.'
    return
  }
  editSubmitting.value = true
  try {
    await httpRequester.put(`/panels/${route.params.panelId}`, editForm.value)
    showEditModal.value = false
    await load()
  } catch (e) {
    editErrorMsg.value = e.response?.data?.resultMessage ?? '저장에 실패했습니다.'
  } finally {
    editSubmitting.value = false
  }
}
</script>

<template>
  <div v-if="loading">불러오는 중...</div>
  <div v-else-if="panel">
    <div style="display:flex;align-items:center;margin-bottom:16px;">
      <h2 style="margin:0;">장비/회로 상세</h2>
      <button class="btn btn-primary" style="margin-left:auto;" @click="openEdit">임계값 설정</button>
    </div>

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
      <span style="font-size:18px;font-weight:700;">{{ panel.name }}</span>
      <span class="badge" :style="{ background: STATUS_COLOR[panel.status] }">{{ STATUS_LABEL[panel.status] ?? panel.status }}</span>
      <span style="font-size:12px;color:var(--color-text-muted);">{{ panel.isOnline ? '통신 정상' : '통신두절' }} · 최근 통신 {{ formatDateTime(panel.lastCommunicatedAt) }}</span>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
      <div class="card" style="padding:12px 16px;">
        <div style="font-size:12px;color:var(--color-text-muted);">소속 현장</div>
        <div style="font-size:16px;font-weight:700;">{{ siteName }}</div>
      </div>
      <div class="card" style="padding:12px 16px;">
        <div style="font-size:12px;color:var(--color-text-muted);">일련번호</div>
        <div style="font-size:16px;font-weight:700;">{{ panel.deviceSerial }}</div>
      </div>
      <div class="card" style="padding:12px 16px;">
        <div style="font-size:12px;color:var(--color-text-muted);">장비번호</div>
        <div style="font-size:16px;font-weight:700;">{{ panel.mNo || '-' }}</div>
      </div>
      <div class="card" style="padding:12px 16px;">
        <div style="font-size:12px;color:var(--color-text-muted);">설치일</div>
        <div style="font-size:16px;font-weight:700;">{{ panel.installedAt || '-' }}</div>
      </div>
      <div class="card" style="padding:12px 16px;">
        <div style="font-size:12px;color:var(--color-text-muted);">회로 개수</div>
        <div style="font-size:16px;font-weight:700;">{{ panel.circuitCount }}</div>
      </div>
    </div>

    <h3>환경 임계값(서버 주의 기준값)</h3>
    <div style="display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap;">
      <div class="card" style="padding:10px 14px;">
        <div style="font-size:11px;color:var(--color-text-muted);">zct 누설전류</div>
        <div style="font-size:15px;font-weight:700;">{{ panel.leakMaThreshold ?? '-' }} mA</div>
      </div>
      <div class="card" style="padding:10px 14px;">
        <div style="font-size:11px;color:var(--color-text-muted);">온도</div>
        <div style="font-size:15px;font-weight:700;">{{ panel.tempThreshold ?? '-' }} 도</div>
      </div>
      <div class="card" style="padding:10px 14px;">
        <div style="font-size:11px;color:var(--color-text-muted);">습도</div>
        <div style="font-size:15px;font-weight:700;">{{ panel.humidityThreshold ?? '-' }} %</div>
      </div>
      <div class="card" style="padding:10px 14px;">
        <div style="font-size:11px;color:var(--color-text-muted);">과전류</div>
        <div style="font-size:15px;font-weight:700;">{{ panel.overcurrentThreshold ?? '-' }} A</div>
      </div>
      <div class="card" style="padding:10px 14px;">
        <div style="font-size:11px;color:var(--color-text-muted);">가스</div>
        <div style="font-size:15px;font-weight:700;">{{ panel.gasThreshold ?? '-' }}</div>
      </div>
      <div class="card" style="padding:10px 14px;">
        <div style="font-size:11px;color:var(--color-text-muted);">불꽃</div>
        <div style="font-size:15px;font-weight:700;">{{ panel.fireThreshold ?? '-' }}</div>
      </div>
    </div>

    <h3>회로 목록</h3>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:24px;">
      <div
        v-for="c in circuits" :key="c.circuitId" class="card"
        :style="{ padding:'14px', textAlign:'center', background: slotColor(c), color: slotTextColor(c) }"
      >
        <div style="font-weight:700;">회로 {{ c.channelNo }}</div>
        <div style="font-size:11px;opacity:.85;">{{ c.loadType || '-' }}</div>
        <div style="font-size:11px;margin-top:4px;">
          {{ c.latestDiagnosis ? (VERDICT_LABEL[c.latestDiagnosis.verdict] ?? c.latestDiagnosis.verdict) : '판정 이력 없음' }}
        </div>
      </div>
      <p v-if="!circuits.length" style="color:var(--color-text-muted);grid-column:1 / -1;">등록된 회로가 없습니다.</p>
    </div>

    <h3>최근 알림</h3>
    <div>
      <div
        v-for="a in recentAlerts" :key="a.alertId" class="card"
        style="display:flex;align-items:center;gap:12px;padding:10px 12px;margin-bottom:6px;"
      >
        <span class="badge" :style="{ background: ALERT_STATUS_COLOR[a.status] }">{{ ALERT_STATUS_LABEL[a.status] ?? a.status }}</span>
        <span style="flex:1;">{{ a.type }}</span>
        <span style="font-size:11px;color:var(--color-text-muted);">{{ formatRelative(a.triggeredAt) }}</span>
      </div>
      <p v-if="!recentAlerts.length" style="color:var(--color-text-muted);">최근 알림이 없습니다.</p>
    </div>

    <!-- 임계값 설정(수정) 모달 -->
    <div v-if="showEditModal" class="modal-overlay" @click.self="showEditModal=false">
      <div class="modal-panel" style="width:420px;">
        <div class="modal-header">분전반 정보/임계값 수정</div>
        <div class="modal-body">
          <div v-if="editErrorMsg" class="banner banner-danger">{{ editErrorMsg }}</div>

          <label class="field-label">분전반명</label>
          <input v-model="editForm.name" class="field-input" />

          <label class="field-label">일련번호</label>
          <input v-model="editForm.deviceSerial" class="field-input" />

          <div style="display:flex;gap:12px;">
            <div style="flex:1;">
              <label class="field-label">회로 개수(1~10)</label>
              <input v-model.number="editForm.circuitCount" type="number" min="1" max="10" class="field-input" />
            </div>
            <div style="flex:1;">
              <label class="field-label">장비번호</label>
              <input v-model="editForm.mNo" class="field-input" />
            </div>
          </div>

          <label class="field-label">설치일</label>
          <input v-model="editForm.installedAt" type="date" class="field-input" />

          <div class="field-label" style="font-weight:600;color:var(--color-text);">환경 임계값 설정</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px;">
            <div>
              <label class="field-label">zct 누설전류(mA)</label>
              <input v-model.number="editForm.leakMaThreshold" type="number" class="field-input" />
            </div>
            <div>
              <label class="field-label">온도(도)</label>
              <input v-model.number="editForm.tempThreshold" type="number" class="field-input" />
            </div>
            <div>
              <label class="field-label">습도(%)</label>
              <input v-model.number="editForm.humidityThreshold" type="number" class="field-input" />
            </div>
            <div>
              <label class="field-label">과전류(A)</label>
              <input v-model.number="editForm.overcurrentThreshold" type="number" class="field-input" />
            </div>
            <div>
              <label class="field-label">가스</label>
              <input v-model.number="editForm.gasThreshold" type="number" class="field-input" />
            </div>
            <div>
              <label class="field-label">불꽃</label>
              <input v-model.number="editForm.fireThreshold" type="number" class="field-input" />
            </div>
          </div>

          <div class="modal-actions">
            <button class="btn btn-primary" style="min-width:120px;" :disabled="editSubmitting" @click="saveEdit">{{ editSubmitting ? '저장 중...' : '저장' }}</button>
            <button class="btn" style="min-width:120px;" @click="showEditModal=false">취소</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
