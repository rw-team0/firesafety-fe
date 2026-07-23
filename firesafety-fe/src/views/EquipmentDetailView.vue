<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import httpRequester from '../utils/httpRequester'

const route = useRoute()
const panel = ref(null)
const siteName = ref('-')
const circuits = ref([]) // 각 항목에 최신 AI 진단결과(diagnosis)를 붙여서 보관
const loading = ref(true)

// 실제 백엔드 Swagger(192.168.0.31:8080/swagger-ui, 2026-07-23 확인) 결과:
// PanelDetailRes엔 전류/전압/전력/도어/온습도/가스·화재 raw값이 전혀 없고(실시간 텔레메트리는 REST로 노출 안 됨),
// 대신 서버 주의(CAUTION) 임계값 6종(leakMaThreshold 등)과 상태/통신정보만 내려옴.
// 회로도 currentA/predictedNextCurrent 같은 필드가 없고, AI 판정은 별도 GET /circuits/{id}/diagnosis에서
// 이진분류(NORMAL/ARC) 이력으로만 제공됨 — 예전 화면은 전부 존재하지 않는 필드를 가정해서 만들어져 있었음.
const STATUS_LABEL = { NORMAL: '정상', CAUTION: '주의', RISK: '위험', OFFLINE: '오프라인' }
const STATUS_COLOR = { NORMAL: 'var(--color-success)', CAUTION: 'var(--color-warning)', RISK: 'var(--color-danger)', OFFLINE: 'var(--color-offline)' }
const VERDICT_LABEL = { NORMAL: '정상', ARC: '아크' }
const VERDICT_COLOR = { NORMAL: 'var(--color-success)', ARC: 'var(--color-danger)' }

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
  loading.value = false
}
onMounted(load)
</script>

<template>
  <div v-if="loading">불러오는 중...</div>
  <div v-else-if="panel">
    <h2 style="margin-top:0;">장비/회로 상세</h2>

    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
      <span style="font-size:18px;font-weight:700;">{{ panel.name }}</span>
      <span class="badge" :style="{ background: STATUS_COLOR[panel.status] }">{{ STATUS_LABEL[panel.status] ?? panel.status }}</span>
      <span style="font-size:12px;color:var(--color-text-muted);">{{ panel.isOnline ? '통신 정상' : '통신두절' }} · 최근 통신 {{ panel.lastCommunicatedAt ?? '-' }}</span>
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

    <h3>환경 임계값 설정(서버 주의 기준값)</h3>
    <p style="font-size:12px;color:var(--color-text-muted);margin-top:-8px;">값 수정은 설비 관리 &gt; 분전반 관리에서 할 수 있습니다.</p>
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
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

    <h3>회로별 AI 진단</h3>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="text-align:left;border-bottom:1px solid var(--color-border);">
          <th style="padding:8px;">채널</th>
          <th style="padding:8px;">부하유형</th>
          <th style="padding:8px;">최신 AI 판정</th>
          <th style="padding:8px;">확률</th>
          <th style="padding:8px;">판정시각</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="c in circuits" :key="c.circuitId" style="border-bottom:1px solid var(--color-border);">
          <td style="padding:8px;">채널 {{ c.channelNo }}</td>
          <td style="padding:8px;">{{ c.loadType ?? '-' }}</td>
          <td style="padding:8px;">
            <span v-if="c.latestDiagnosis" class="badge" :style="{ background: VERDICT_COLOR[c.latestDiagnosis.verdict] }">
              {{ VERDICT_LABEL[c.latestDiagnosis.verdict] ?? c.latestDiagnosis.verdict }}
            </span>
            <span v-else style="color:var(--color-text-muted);">판정 이력 없음</span>
          </td>
          <td style="padding:8px;">{{ c.latestDiagnosis?.confidence != null ? Math.round(c.latestDiagnosis.confidence * 100) + '%' : '-' }}</td>
          <td style="padding:8px;">{{ c.latestDiagnosis?.diagnosedAt ?? '-' }}</td>
        </tr>
        <tr v-if="!circuits.length">
          <td colspan="5" style="padding:16px;text-align:center;color:var(--color-text-muted);">등록된 회로가 없습니다.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
