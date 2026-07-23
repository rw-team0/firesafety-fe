<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import httpRequester from '../utils/httpRequester'
import ConfirmModal from '../components/ConfirmModal.vue'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const canGenerateReport = auth.role === 'ADMIN' || auth.role === 'SUPER_ADMIN'

// period 파라미터의 정확한 값 형식은 명세에 없어서 일수를 그대로 문자열로 보냄(가정)
const period = ref('30')
const dailyAlertCounts = ref([])
const circuitRiskRanking = ref([])
const loading = ref(false)
const showReportConfirm = ref(false)
const generating = ref(false)
const reportResult = ref('')

const maxCount = computed(() => Math.max(1, ...dailyAlertCounts.value.map(d => d.count ?? 0)))
const maxRisk = computed(() => Math.max(1, ...circuitRiskRanking.value.map(c => c.riskCount ?? c.count ?? 0)))

async function load() {
  loading.value = true
  const res = await httpRequester.get('/statistics', { params: { period: period.value } }) // API-024
  dailyAlertCounts.value = res.data.resultData.dailyAlertCounts ?? []
  circuitRiskRanking.value = res.data.resultData.circuitRiskRanking ?? []
  loading.value = false
}
onMounted(load)
watch(period, load)

async function generateReport() {
  generating.value = true
  showReportConfirm.value = false
  try {
    const res = await httpRequester.post('/reports', { // API-025
      type: 'ALERT_STATISTICS',
      periodStart: '', // TODO: period(일수)를 실제 날짜 범위로 변환해서 채워야 함 — 정확한 계산 규칙 미확정
      periodEnd: '',
    })
    reportResult.value = res.data.resultMessage
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <div>
    <h2 style="margin-top:0;">통계 / 리포트</h2>

    <div style="display:flex;gap:8px;align-items:center;margin-bottom:20px;">
      <select v-model="period">
        <option value="30">최근 30일간</option>
        <option value="15">최근 15일간</option>
        <option value="10">최근 10일간</option>
        <option value="7">최근 7일간</option>
        <option value="1">최근 1일간</option>
      </select>
      <button v-if="canGenerateReport" class="btn btn-primary" :disabled="generating" @click="showReportConfirm = true" style="margin-left:auto;">
        {{ generating ? '생성 중...' : '리포트 생성' }}
      </button>
      <button v-else class="btn" disabled title="관리자 이상만 리포트를 생성할 수 있습니다." style="margin-left:auto;">리포트 생성</button>
    </div>
    <p v-if="reportResult" style="color:var(--color-success);">{{ reportResult }}</p>

    <p v-if="loading" style="color:var(--color-text-muted);">불러오는 중...</p>
    <template v-else>
      <h3>기간별 알람 발생 빈도</h3>
      <div style="display:flex;align-items:flex-end;gap:6px;height:140px;margin-bottom:28px;border-bottom:1px solid var(--color-border);padding-bottom:4px;">
        <div v-for="d in dailyAlertCounts" :key="d.date" style="display:flex;flex-direction:column;align-items:center;flex:1;">
          <div :style="{ background:'var(--color-warning)', width:'70%', height: (d.count / maxCount * 120) + 'px' }"></div>
          <div style="font-size:10px;color:var(--color-text-muted);margin-top:4px;white-space:nowrap;">{{ d.date }}</div>
        </div>
        <p v-if="!dailyAlertCounts.length" style="color:var(--color-text-muted);">데이터가 없습니다.</p>
      </div>

      <h3>회로별 위험 발생 순위</h3>
      <div>
        <div v-for="(c, i) in circuitRiskRanking" :key="i" style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <div style="width:90px;font-size:12px;">{{ c.panelName ?? c.circuitId }}{{ c.circuitNo != null ? ' 채널'+c.circuitNo : '' }}</div>
          <div style="flex:1;background:var(--color-bg);border-radius:4px;overflow:hidden;">
            <div :style="{ background:'var(--color-danger)', width: ((c.riskCount ?? c.count ?? 0) / maxRisk * 100) + '%', padding:'4px 8px', color:'#fff', fontSize:'11px' }">
              {{ c.riskCount ?? c.count ?? 0 }}
            </div>
          </div>
        </div>
        <p v-if="!circuitRiskRanking.length" style="color:var(--color-text-muted);">데이터가 없습니다.</p>
      </div>
    </template>

    <ConfirmModal v-if="showReportConfirm" title="리포트 생성" message="리포트를 생성하시겠습니까?"
      @confirm="generateReport" @cancel="showReportConfirm=false" />
  </div>
</template>
