<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import httpRequester from '../utils/httpRequester'

const router = useRouter()
const sites = ref([])
// 백엔드팀 API 가이드(2026-07-23, 프론트엔드 공유용) 확인 결과 필드: name/deviceSerial/installedAt/circuitCount/
// leakMaThreshold/tempThreshold/humidityThreshold/overcurrentThreshold/gasThreshold/fireThreshold/mNo
// (mNo는 Swagger 화면엔 mno로 잘못 표시될 수 있다고 가이드에 명시됨 — 실제 요청/응답은 항상 mNo)
// (예전엔 name/circuitCount/임계값을 아예 안 보내고 있어서 실제로는 등록이 안 됐음)
const form = ref({
  siteId: null, name: '', deviceSerial: '', installedAt: '', circuitCount: 1,
  leakMaThreshold: null, tempThreshold: null, humidityThreshold: null,
  overcurrentThreshold: null, gasThreshold: null, fireThreshold: null, mNo: '',
})
const errorMsg = ref('')
const loading = ref(false)

onMounted(async () => {
  const res = await httpRequester.get('/sites') // API-009
  sites.value = res.data.resultData
  if (sites.value.length) form.value.siteId = sites.value[0].siteId
})

async function submit() {
  errorMsg.value = ''
  if (!form.value.siteId || !form.value.name || !form.value.deviceSerial) {
    errorMsg.value = '현장/분전반명/일련번호를 입력해주세요.'
    return
  }
  loading.value = true
  try {
    const { siteId, ...body } = form.value
    await httpRequester.post(`/sites/${siteId}/panels`, body) // Swagger 확인: POST /api/sites/{siteId}/panels
    router.push('/settings/facilities')
  } catch (e) {
    errorMsg.value = e.response?.data?.resultMessage ?? '등록에 실패했습니다.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h2 style="margin-top:0;">분전반 등록</h2>
    <div class="card" style="max-width:420px;padding:24px;">
      <div v-if="errorMsg" class="banner banner-danger">{{ errorMsg }}</div>

      <label class="field-label">현장</label>
      <select v-model="form.siteId" class="field-input">
        <option v-for="s in sites" :key="s.siteId" :value="s.siteId">{{ s.name }}</option>
      </select>

      <label class="field-label">분전반명</label>
      <input v-model="form.name" placeholder="분전반명" class="field-input" />

      <label class="field-label">일련번호(deviceSerial)</label>
      <input v-model="form.deviceSerial" placeholder="일련번호" class="field-input" />

      <label class="field-label">회로 개수(1~10)</label>
      <input v-model.number="form.circuitCount" type="number" min="1" max="10" class="field-input" />

      <label class="field-label">장비번호</label>
      <input v-model="form.mNo" placeholder="장비번호" class="field-input" />

      <label class="field-label">설치일(선택)</label>
      <input v-model="form.installedAt" type="date" class="field-input" />

      <p class="field-label" style="font-weight:600;color:var(--color-text);">환경 임계값 설정(서버 주의 기준값, 선택)</p>
      <p style="font-size:12px;color:var(--color-text-muted);margin:-8px 0 12px;word-break:keep-all;">설정값 이상이 30초 이상 지속되면 '주의' 상태로 전환됩니다.</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 12px;">
        <div>
          <label class="field-label">zct 누설전류(mA)</label>
          <input v-model.number="form.leakMaThreshold" type="number" class="field-input" />
        </div>
        <div>
          <label class="field-label">온도(도)</label>
          <input v-model.number="form.tempThreshold" type="number" class="field-input" />
        </div>
        <div>
          <label class="field-label">습도(%)</label>
          <input v-model.number="form.humidityThreshold" type="number" class="field-input" />
        </div>
        <div>
          <label class="field-label">과전류(A)</label>
          <input v-model.number="form.overcurrentThreshold" type="number" class="field-input" />
        </div>
        <div>
          <label class="field-label">가스</label>
          <input v-model.number="form.gasThreshold" type="number" class="field-input" />
        </div>
        <div>
          <label class="field-label">불꽃</label>
          <input v-model.number="form.fireThreshold" type="number" class="field-input" />
        </div>
      </div>

      <button class="btn btn-primary" style="margin-top:8px;" :disabled="loading" @click="submit">{{ loading ? '등록 중...' : '등록' }}</button>
    </div>
  </div>
</template>
