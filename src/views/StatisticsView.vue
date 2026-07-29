<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import httpRequester from '../utils/httpRequester'
import { useUiAlertStore } from '../stores/uiAlert'
import { isoDate } from '@/utils/formatters'

const uiAlert = useUiAlertStore()

// 실제 백엔드 Swagger(192.168.0.31:8080/swagger-ui, 2026-07-23 확인) 결과:
// - GET /statistics는 period가 아니라 siteId(선택)/from/to(날짜) 파라미터를 씀 — period는 실재하지 않았음
// - 응답도 dailyAlertCounts/circuitRiskRanking 평면 배열이 아니라 alerts/diagnoses/panels 3개 집계 객체 구조
// - 리포트 생성 기능은 제공하지 않기로 함(POST /reports API도 없음) — 관련 UI 전부 제거
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

// ── 예방조치 이행률 추이 ──────────────────────────────────────────────
// GET /statistics의 dailyCounts는 "일자별 발생 건수"만 주고 상태(RESOLVED 등)별로는 안 쪼개져 있어서
// 이행률(=조치완료 비율) 추이는 이 API만으로 계산이 안 됨. 그래서 GET /alerts를 기간 전체 조회한 뒤
// 프론트에서 발생일자별로 직접 묶어서 계산한다(백엔드 변경 없이 가능).
const preventiveRate = ref([])        // [{ date, total, resolved, rate }] 날짜 오름차순
const preventiveRateLoading = ref(false)

async function loadPreventiveRate() {
  preventiveRateLoading.value = true
  const FETCH_SIZE = 100
  let all = []
  let fetchPage = 0
  let total = Infinity
  // AlertListReq도 페이지네이션이 있어서(설비 관리이력 화면과 동일한 패턴), size를 키워가며
  // 전량을 받아와야 날짜별 집계가 정확해진다 — 화면에 보이는 페이지만 갖고 계산하면 안 됨
  while (all.length < total) {
    const params = { page: fetchPage, size: FETCH_SIZE, from: from.value, to: to.value }
    if (siteId.value) params.siteId = siteId.value
    const res = await httpRequester.get('/alerts', { params })
    const { content, totalElements: te } = res.data.resultData
    all = all.concat(content)
    total = te
    if (!content.length) break
    fetchPage++
  }

  // 발생일(triggeredAt)의 날짜 부분만 잘라서 버킷 키로 쓰고, 그중 "현재" RESOLVED 상태인 것만 센다.
  // 주의: 이건 "그날 안에 처리됐다"가 아니라 "지금 시점 기준 처리된 비율"이라, 최근 며칠은
  // 아직 처리할 시간이 부족해서 이행률이 낮게 나올 수 있음(화면에 안내 문구로 표시)
  const byDate = {}
  for (const a of all) {
    const date = a.triggeredAt.slice(0, 10)
    if (!byDate[date]) byDate[date] = { date, total: 0, resolved: 0 }
    byDate[date].total++
    if (a.status === 'RESOLVED') byDate[date].resolved++
  }
  preventiveRate.value = Object.values(byDate)
    .sort((x, y) => x.date.localeCompare(y.date))
    .map((d) => ({ ...d, rate: Math.round((d.resolved / d.total) * 100) }))

  preventiveRateLoading.value = false
}

// 라인차트 라이브러리가 없는 화면이라(다른 차트들도 전부 손수 CSS/SVG) <svg><polyline>로 직접 그림.
// viewBox를 "x: 0~300, y: 0~100(=이행률 %)"로 고정해두면 좌표 계산이 각각 이렇게 단순해짐:
// x = 인덱스를 균등 배치, y = 100 - 이행률(SVG는 아래로 갈수록 y가 커져서 뒤집어줘야 위가 100%가 됨)
const preventiveRatePolylinePoints = computed(() => {
  const data = preventiveRate.value
  if (data.length < 2) return ''
  const stepX = 300 / (data.length - 1)
  return data.map((d, i) => `${i * stepX},${100 - d.rate}`).join(' ')
})

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
let pollTimer = null
onMounted(async () => {
  await loadSites()
  // 이행률 계산은 /alerts를 전량 페이지 순회하는 무거운 조회라 15초 폴링 대상에서는 빼고
  // (아래 pollTimer는 load만 재실행) 최초 진입/필터 변경 시에만 다시 계산한다
  await Promise.all([load(), loadPreventiveRate()])
  pollTimer = setInterval(load, 15000)
})

onUnmounted(() => {
  if (pollTimer) clearInterval(pollTimer)
})
watch([from, to, siteId], () => { load(); loadPreventiveRate() })

function exportExcel() {
  // 통계 전용 엑셀 출력 API는 백엔드에 없음(Swagger 확인, StatisticsController엔 GET /statistics 하나뿐) — 안내만
  uiAlert.show('통계 출력 기능은 아직 백엔드에 구현되어 있지 않습니다.')
}
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
      <button class="btn" style="margin-left:auto;" @click="exportExcel">출력</button>
    </div>

    <p v-if="loading" style="color:var(--color-text-muted);"><span class="spinner"></span>불러오는 중...</p>
    <template v-else-if="summary">
      <h3>일자별 경보 발생 빈도(총 {{ summary.alerts.totalCount }}건)</h3>
      <div style="display:flex;align-items:flex-end;gap:6px;height:140px;margin-bottom:28px;border-bottom:1px solid var(--color-border);padding-bottom:4px;">
        <div v-for="d in summary.alerts.dailyCounts" :key="d.date" style="display:flex;flex-direction:column;align-items:center;flex:1;">
          <div :style="{ background:'var(--color-warning)', width:'70%', height: (d.count / maxDaily * 120) + 'px' }"></div>
          <div style="font-size:10px;color:var(--color-text-muted);margin-top:4px;white-space:nowrap;">{{ d.date }}</div>
        </div>
        <p v-if="!summary.alerts.dailyCounts.length" style="color:var(--color-text-muted);">데이터가 없습니다.</p>
      </div>

      <!-- 예방조치 이행률 추이: 발생일 기준으로 그날 발생한 알림 중 지금 RESOLVED인 비율(%) -->
      <h3>예방조치 이행률 추이(발생일 기준 조치완료 비율)</h3>
      <!-- <p style="font-size:12px;color:var(--color-text-muted);margin:-4px 0 12px;">
        최근 며칠은 아직 처리 중인 건이 많아 이행률이 낮게 보일 수 있습니다.
      </p> -->
      <p v-if="preventiveRateLoading" style="color:var(--color-text-muted);"><span class="spinner"></span>불러오는 중...</p>
      <template v-else-if="preventiveRate.length">
        <svg viewBox="0 0 300 100" preserveAspectRatio="none" style="width:100%;height:140px;background:var(--color-bg);border-radius:8px;margin-bottom:4px;">
          <!-- 50% 기준선: 절반도 못 채운 날인지 한눈에 보기 위한 안내선 -->
          <line x1="0" y1="50" x2="300" y2="50" stroke="var(--color-border)" stroke-width="1" stroke-dasharray="4 4" />
          <!-- 실제 이행률 추이선. non-scaling-stroke를 줘야 viewBox가 늘어나도 선 굵기가 찌그러지지 않음 -->
          <polyline :points="preventiveRatePolylinePoints" fill="none" stroke="var(--color-success)" stroke-width="2" vector-effect="non-scaling-stroke" />
          <!-- 날짜별 실제 값 지점을 점으로 강조 표시 -->
          <circle
            v-for="(d, i) in preventiveRate" :key="d.date"
            :cx="i * (300 / Math.max(1, preventiveRate.length - 1))" :cy="100 - d.rate" r="2.4"
            fill="var(--color-success)"
          />
        </svg>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--color-text-muted);margin-bottom:28px;">
          <span>{{ preventiveRate[0]?.date }} ({{ preventiveRate[0]?.rate }}%)</span>
          <span>{{ preventiveRate[preventiveRate.length - 1]?.date }} ({{ preventiveRate[preventiveRate.length - 1]?.rate }}%)</span>
        </div>
      </template>
      <p v-else style="color:var(--color-text-muted);margin-bottom:28px;">데이터가 없습니다.</p>

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
