<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import httpRequester from '../utils/httpRequester'

const router = useRouter()
const sites = ref([])
const form = ref({ siteId: null, deviceSerial: '', mNo: '', installedAt: '' })
const errorMsg = ref('')
const loading = ref(false)

onMounted(async () => {
  const res = await httpRequester.get('/sites') // API-009
  sites.value = res.data.resultData
  if (sites.value.length) form.value.siteId = sites.value[0].siteId
})

async function submit() {
  errorMsg.value = ''
  if (!form.value.siteId || !form.value.deviceSerial || !form.value.mNo) {
    errorMsg.value = '현장/일련번호/M_NO를 입력해주세요.'
    return
  }
  loading.value = true
  try {
    const { siteId, ...body } = form.value
    await httpRequester.post(`/sites/${siteId}/panels`, body) // API-010
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

      <label class="field-label">일련번호(deviceSerial)</label>
      <input v-model="form.deviceSerial" placeholder="일련번호" class="field-input" />

      <label class="field-label">M_NO</label>
      <input v-model="form.mNo" placeholder="M_NO" class="field-input" />

      <label class="field-label">설치일</label>
      <input v-model="form.installedAt" type="date" class="field-input" />

      <button class="btn btn-primary" :disabled="loading" @click="submit">{{ loading ? '등록 중...' : '등록' }}</button>
    </div>
  </div>
</template>
