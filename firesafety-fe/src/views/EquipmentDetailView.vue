<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import httpRequester from '../utils/httpRequester'

const route = useRoute()
const panel = ref(null)
const loading = ref(true)

// TODO(백엔드 확인 필요): API-012 응답(백엔드가이드/API명세서 기준)엔 임계치 필드가 없어서
// "임계치 초과 시 강조"를 정확히 계산할 수 없음. 아래는 임시로 흔한 전류 임계치(30A)를 가정해 강조만 해둔 것 —
// 실제 임계치는 panel 기준으로 관리된다고 되어 있으니(백엔드가이드 10.5절) 값이 내려오면 교체할 것
const ASSUMED_CURRENT_THRESHOLD = 30

async function load() {
  loading.value = true
  const res = await httpRequester.get(`/panels/${route.params.panelId}`) // API-012
  panel.value = res.data.resultData
  loading.value = false
}
onMounted(load)
</script>

<template>
  <div v-if="loading">불러오는 중...</div>
  <div v-else-if="panel">
    <h2 style="margin-top:0;">장비/회로 상세</h2>

    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
      <div class="card" style="padding:12px 16px;">
        <div style="font-size:12px;color:var(--color-text-muted);">전체전류</div>
        <div style="font-size:20px;font-weight:700;">{{ panel.totalCurrent }} A</div>
      </div>
      <div class="card" style="padding:12px 16px;">
        <div style="font-size:12px;color:var(--color-text-muted);">전압</div>
        <div style="font-size:20px;font-weight:700;">{{ panel.voltV }} V</div>
      </div>
      <div class="card" style="padding:12px 16px;">
        <div style="font-size:12px;color:var(--color-text-muted);">전력</div>
        <div style="font-size:20px;font-weight:700;">{{ panel.totalPower }} W</div>
      </div>
      <div class="card" style="padding:12px 16px;">
        <div style="font-size:12px;color:var(--color-text-muted);">도어 상태</div>
        <div style="font-size:20px;font-weight:700;">{{ panel.doorStatus ? '열림' : '닫힘' }}</div>
      </div>
    </div>

    <h3>환경 정보</h3>
    <div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap;">
      <div>온도: {{ panel.temperature }}°C</div>
      <div>습도: {{ panel.humidity }}%</div>
      <div>화재감지(raw): {{ panel.fireRaw }}</div>
      <div>가스감지(raw): {{ panel.gasRaw }}</div>
    </div>

    <h3>회로별 전류값</h3>
    <table style="width:100%;border-collapse:collapse;">
      <thead>
        <tr style="text-align:left;border-bottom:1px solid var(--color-border);">
          <th style="padding:8px;">채널</th>
          <th style="padding:8px;">전류값</th>
          <th style="padding:8px;">AI 예측 전류값</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="c in panel.circuits"
          :key="c.circuitId"
          style="border-bottom:1px solid var(--color-border);"
          :style="{ color: c.currentA > ASSUMED_CURRENT_THRESHOLD ? 'var(--color-danger)' : 'inherit', fontWeight: c.currentA > ASSUMED_CURRENT_THRESHOLD ? 700 : 400 }"
        >
          <td style="padding:8px;">채널 {{ c.channelNo }}</td>
          <td style="padding:8px;">{{ c.currentA }} A</td>
          <td style="padding:8px;">{{ c.predictedNextCurrent != null ? c.predictedNextCurrent + ' A' : '-' }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
