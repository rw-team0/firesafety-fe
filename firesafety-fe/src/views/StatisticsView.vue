<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import httpRequester from '../utils/httpRequester'
import { useUiAlertStore } from '../stores/uiAlert'
import { useAuthStore } from '../stores/auth'
import ConfirmModal from '../components/ConfirmModal.vue'

const uiAlert = useUiAlertStore()
const auth = useAuthStore()
const canGenerateReport = auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN' // 와이어프레임 S-010: 일반 사용자는 리포트 생성 버튼 비활성
const showReportConfirm = ref(false)

// 실제 백엔드 Swagger(192.168.0.31:8080/swagger-ui, 2026-07-23 확인) 결과:
// - GET /statistics는 period가 아니라 siteId(선택)/from/to(날짜) 파라미터를 씀 — period는 실재하지 않았음
// - 응답도 dailyAlertCounts/circuitRiskRanking 평면 배열이 아니라 alerts/diagnoses/panels 3개 집계 객체 구조
// - POST /reports(리포트 생성) API는 Swagger에 아예 없음 — 백엔드 미구현으로 확인, 버튼은 안내만 하도록 변경
function isoDate(d) { return d.toISOString().slice(0, 10) }
const today = new Date()
const monthAgo = new Date(today)
monthAgo.setDate(monthAgo.getDate() - 30)

const sites = ref([])
const siteId = ref('')
const from = ref(isoDate(monthAgo))
const to = ref(isoDate(today))
const summary = ref(null)
const loading = ref(false)

const maxDaily = computed(() => Math.max(1, ...(summary.value?.alerts?.dailyCounts ?? []).map(d => d.count ?? 0)))
const maxTypeCount = computed(() => Math.max(1, ...(summary.value?.alerts?.typeCounts ?? []).map(c => c.count ?? 0)))
const maxPanelStatusCount = computed(() => Math.max(1, ...(summary.value?.panels?.statusCounts ?? []).map(c => c.count ?? 0)))

const STATUS_BAR_COLOR = { NORMAL: 'var(--color-success)', CAUTION: 'var(--color-warning)', RISK: 'var(--color-danger)', OFFLINE: 'var(--color-offline)' }
const VERDICT_COLOR = { NORMAL: 'var(--color-success)', ARC: 'var(--color-danger)' }

async function loadSites() {
  const res = await httpRequester.get('/sites')
  sites.value = res.data.resultData
}

async function load() {
  loading.value = true
  const params = { from: from.value, to: to.value }
  if (siteId.value) params.siteId = siteId.value
  const res = await httpRequester.get('/statistics', { params })
  summary.value = res.data.resultData
  loading.value = false
}
onMounted(async () => {
  await loadSites()
  await load()
})
watch([from, to, siteId], load)

function generateReport() {
  showReportConfirm.value = false
  // 리포트 생성 API가 백엔드에 없음(Swagger 확인) — 구현되면 이 자리에서 POST /reports 호출로 교체
  uiAlert.show('리포트 생성 기능은 아직 백엔드에 구현되어 있지 않습니다.')
}
</script>

<template>
  <div>
    <h2 style="margin-top:0;">통계 / 리포트</h2>

    <div style="display:flex;gap:8px;align-items:center;margin-bottom:20px;flex-wrap:wrap;">
      <select v-model="siteId" class="field-input" style="margin-bottom:0;width:160px;">
        <option value="">전체 현장</option>
        <option v-for="s in sites" :key="s.siteId" :value="s.siteId">{{ s.name }}</option>
      </select>
      <input v-model="from" type="date" class="field-input" style="margin-bottom:0;width:150px;" />
      <span style="color:var(--color-text-muted);">~</span>
      <input v-model="to" type="date" class="field-input" style="margin-bottom:0;width:150px;" />
      <button v-if="canGenerateReport" class="btn btn-primary" style="margin-left:auto;" @click="showReportConfirm = true">리포트 생성</button>
      <button v-else class="btn" disabled title="관리자 이상만 리포트를 생성할 수 있습니다." style="margin-left:auto;">리포트 생성</button>
    </div>

    <p v-if="loading" style="color:var(--color-text-muted);">불러오는 중...</p>
    <template v-else-if="summary">
      <h3>일자별 경보 발생 빈도(총 {{ summary.alerts.totalCount }}건)</h3>
      <div style="display:flex;align-items:flex-end;gap:6px;height:140px;margin-bottom:28px;border-bottom:1px solid var(--color-border);padding-bottom:4px;">
        <div v-for="d in summary.alerts.dailyCounts" :key="d.date" style="display:flex;flex-direction:column;align-items:center;flex:1;">
          <div :style="{ background:'var(--color-warning)', width:'70%', height: (d.count / maxDaily * 120) + 'px' }"></div>
          <div style="font-size:10px;color:var(--color-text-muted);margin-top:4px;white-space:nowrap;">{{ d.date }}</div>
        </div>
        <p v-if="!summary.alerts.dailyCounts.length" style="color:var(--color-text-muted);">데이터가 없습니다.</p>
      </div>

      <div style="display:flex;gap:32px;flex-wrap:wrap;margin-bottom:28px;">
        <div style="flex:1;min-width:260px;">
          <h3>경보 유형별 발생</h3>
          <div v-for="c in summary.alerts.typeCounts" :key="c.key" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <div style="width:70px;font-size:12px;">{{ c.label }}</div>
            <div style="flex:1;background:var(--color-bg);border-radius:4px;overflow:hidden;">
              <div :style="{ background:'var(--color-danger)', width: (c.count / maxTypeCount * 100) + '%', padding:'4px 8px', color:'#fff', fontSize:'11px' }">{{ c.count }}</div>
            </div>
          </div>
          <p v-if="!summary.alerts.typeCounts.length" style="color:var(--color-text-muted);">데이터가 없습니다.</p>
        </div>

        <div style="flex:1;min-width:220px;">
          <h3>분전반 상태 분포(활성 {{ summary.panels.totalCount }}대)</h3>
          <div v-for="c in summary.panels.statusCounts" :key="c.key" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <div style="width:70px;font-size:12px;">{{ c.label }}</div>
            <div style="flex:1;background:var(--color-bg);border-radius:4px;overflow:hidden;">
              <div :style="{ background: STATUS_BAR_COLOR[c.key] ?? 'var(--color-offline)', width: (c.count / maxPanelStatusCount * 100) + '%', padding:'4px 8px', color:'#fff', fontSize:'11px' }">{{ c.count }}</div>
            </div>
          </div>
          <p v-if="!summary.panels.statusCounts.length" style="color:var(--color-text-muted);">데이터가 없습니다.</p>
        </div>
      </div>

      <h3>AI 진단 결과(총 {{ summary.diagnoses.totalCount }}건)</h3>
      <div style="display:flex;gap:12px;margin-bottom:12px;">
        <div v-for="c in summary.diagnoses.verdictCounts" :key="c.key" class="card" style="padding:12px 20px;">
          <div style="font-size:12px;color:var(--color-text-muted);">{{ c.label }}</div>
          <div style="font-size:24px;font-weight:700;" :style="{ color: VERDICT_COLOR[c.key] ?? 'inherit' }">{{ c.count }}</div>
        </div>
        <p v-if="!summary.diagnoses.verdictCounts.length" style="color:var(--color-text-muted);">데이터가 없습니다.</p>
      </div>
    </template>

    <ConfirmModal v-if="showReportConfirm" title="리포트 생성" message="리포트를 생성하시겠습니까?"
      @confirm="generateReport" @cancel="showReportConfirm=false" />
  </div>
</template>
