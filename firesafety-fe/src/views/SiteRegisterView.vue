<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import httpRequester from '../utils/httpRequester'

const router = useRouter()
const form = ref({ name: '', address: '' })
const errorMsg = ref('')
const loading = ref(false)

// API-008: 현장 등록은 SUPER_ADMIN 전용(백엔드가이드 10.5절), 라우터 meta.requiredRole로도 이미 막혀있음
async function submit() {
  errorMsg.value = ''
  if (!form.value.name) {
    errorMsg.value = '현장명을 입력해주세요.'
    return
  }
  loading.value = true
  try {
    await httpRequester.post('/sites', form.value) // API-008
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
    <h2 style="margin-top:0;">현장 등록</h2>
    <div class="card" style="max-width:420px;padding:24px;">
      <div v-if="errorMsg" class="banner banner-danger">{{ errorMsg }}</div>

      <label class="field-label">현장명</label>
      <input v-model="form.name" placeholder="현장명" class="field-input" />

      <label class="field-label">주소</label>
      <input v-model="form.address" placeholder="주소" class="field-input" />

      <button class="btn btn-primary" :disabled="loading" @click="submit">{{ loading ? '등록 중...' : '등록' }}</button>
    </div>
  </div>
</template>
