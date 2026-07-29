<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import httpRequester from '../utils/httpRequester'

const router = useRouter()
const panels = ref([])
const usedChannels = ref([])
const panelId = ref(null)
const channelNo = ref(null)
const loadType = ref('')
const errorMsg = ref('')
const loading = ref(false)

// 회로 채널은 물리적으로 최대 10개(백엔드가이드 10.5절: panel.circuit_count 범위 안에서만 허용)
const availableChannels = computed(() =>
  Array.from({ length: 10 }, (_, i) => i + 1).filter(n => !usedChannels.value.includes(n))
)

onMounted(async () => {
  const res = await httpRequester.get('/panels') // API-011
  panels.value = res.data.resultData
  if (panels.value.length) panelId.value = panels.value[0].panelId
})

async function loadUsedChannels() {
  if (!panelId.value) return
  const res = await httpRequester.get(`/panels/${panelId.value}`) // API-012
  usedChannels.value = (res.data.resultData.circuits ?? []).map(c => c.channelNo)
  channelNo.value = availableChannels.value[0] ?? null
}
watch(panelId, loadUsedChannels, { immediate: true })

async function submit() {
  errorMsg.value = ''
  if (!panelId.value || !channelNo.value) {
    errorMsg.value = '분전반과 채널 번호를 선택해주세요.'
    return
  }
  loading.value = true
  try {
    await httpRequester.post(`/panels/${panelId.value}/circuits`, { // API-013
      channelNo: channelNo.value,
      loadType: loadType.value,
    })
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
    <h2 style="margin-top:0;">회로 등록</h2>
    <div class="card" style="max-width:420px;padding:24px;">
      <div v-if="errorMsg" class="banner banner-danger">{{ errorMsg }}</div>

      <label class="field-label">분전반</label>
      <select v-model="panelId" class="field-input">
        <option v-for="p in panels" :key="p.panelId" :value="p.panelId">{{ p.name }}</option>
      </select>

      <label class="field-label">채널 번호 (최대 10개, 사용중 {{ usedChannels.length }}/10)</label>
      <select v-model="channelNo" class="field-input" :disabled="!availableChannels.length">
        <option v-for="n in availableChannels" :key="n" :value="n">채널 {{ n }}</option>
      </select>
      <p v-if="!availableChannels.length" style="color:var(--color-warning);font-size:12.5px;margin-top:-10px;">이 분전반은 채널이 모두 사용중입니다(10/10).</p>

      <label class="field-label">부하 유형(loadType)</label>
      <input v-model="loadType" placeholder="예: LIGHTING" class="field-input" />

      <button class="btn btn-primary" :disabled="loading || !availableChannels.length" @click="submit">{{ loading ? '등록 중...' : '등록' }}</button>
    </div>
  </div>
</template>
