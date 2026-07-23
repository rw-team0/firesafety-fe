<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import httpRequester from '../utils/httpRequester'

// 실제 백엔드 Swagger(192.168.0.31:8080/swagger-ui, 2026-07-23 확인) 결과:
// - GET /statistics는 period가 아니라 siteId(선택)/from/to(날짜) 파라미터를 씀 — period는 실재하지 않았음
// - 응답도 dailyAlertCounts/circuitRiskRanking 평면 배열이 아니라 alerts/diagnoses/panels 3개 집계 객체 구조
// - 리포트 생성 기능은 제공하지 않기로 함(POST /reports API도 없음) — 관련 UI 전부 제거
function isoDate(d) { return d.toISOString().slice(0, 10) }
const today = new Date()
const weekAgo = new Date(today)
weekAgo.setDate(weekAgo.getDate() - 7)

const sites = ref([])
const siteId = ref('')
const from = ref(isoDate(weekAgo))
const to = ref(isoDate(today))
const summary = ref(null)
const loading = ref(false)

const maxDaily = computed(() => Math.max(1, ...(summary.value?.alerts?.dailyCounts ?? []).map(d => d.count ?? 0)))
const maxTypeCount = computed(() => Math.max(1, ...(summary.value?.alerts?.typeCounts ?? []).map(c => c.count ?? 0)))

const STATUS_BAR_COLOR = { NORMAL: 'var(--color-success)', CAUTION: 'var(--color-warning)', RISK: 'var(--color-danger)', OFFLINE: 'var(--color-offline)' }

// 분전반 상태 분포 원형그래프용 conic-gradient 계산
const panelStatusConicGradient = computed(() => {
  const counts = summary.value?.panels?.statusCounts ?? []
  const total = counts.reduce((sum, c) => sum + (c.count ?? 0), 0)
  if (!total) return 'var(--color-bg)'
  let acc = 0
  const stops = counts.map((c) => {
    const start = (acc / total) * 100
    acc += c.count ?? 0
    const end = (acc / total) * 100
    return `${STATUS_BAR_COLOR[c.key] ?? 'var(--color-offline)'} ${start}% ${end}%`
  })
  return `conic-gradient(${stops.join(', ')})`
})

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
</script>

<template>
  <div>
    <h2 style="margin-top:0;">통계</h2>

    <div style="display:flex;gap:8px;align-items:center;margin-bottom:20px;flex-wrap:wrap;">
      <select v-model="siteId" class="field-input" style="margin-bottom:0;width:160px;">
        <option value="">전체 현장</option>
        <option v-for="s in sites" :key="s.siteId" :value="s.siteId">{{ s.name }}</option>
      </select>
      <input v-model="from" type="date" class="field-input" style="margin-bottom:0;width:150px;" />
      <span style="color:var(--color-text-muted);">~</span>
      <input v-model="to" type="date" class="field-input" style="margin-bottom:0;width:150px;" />
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
          <h3>분전반 상태 분포({{ summary.panels.totalCount }}대)</h3>
          <div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
            <div :style="{ width:'280px', height:'280px', flex:'none', borderRadius:'50%', background: panelStatusConicGradient }"></div>
            <div style="display:flex;gap:16px;flex-wrap:wrap;justify-content:center;">
              <div v-for="c in summary.panels.statusCounts" :key="c.key" style="display:flex;align-items:center;gap:6px;font-size:12px;">
                <span :style="{ width:'10px', height:'10px', borderRadius:'50%', background: STATUS_BAR_COLOR[c.key] ?? 'var(--color-offline)', display:'inline-block', flex:'none' }"></span>
                <span>{{ c.label }}</span>
                <span style="color:var(--color-text-muted);">{{ c.count }}대</span>
              </div>
            </div>
          </div>
          <p v-if="!summary.panels.statusCounts.length" style="color:var(--color-text-muted);">데이터가 없습니다.</p>
        </div>

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
      </div>
    </template>
  </div>
</template>
