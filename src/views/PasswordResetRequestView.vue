<script setup>
import { ref } from 'vue'
import httpRequester from '../utils/httpRequester'

const email = ref('')
const loading = ref(false)
const submitted = ref(false)
const resultMessage = ref('')

// ACC-008: 계정 존재 여부와 무관하게 항상 동일 응답(백엔드가 보장, 9.4절) — FE는 받은 메시지를 그대로 보여주면 됨
// 엔드포인트/필드명은 두 가이드에 명시가 없어 CLAUDE.md의 기존 가정을 그대로 사용
async function submit() {
  if (!email.value) return
  loading.value = true
  try {
    const res = await httpRequester.post('/auth/password-reset/request', { email: email.value })
    resultMessage.value = res.data.resultMessage
    submitted.value = true
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card card">
      <div class="brand">
        <span class="dot"></span>
        <span>FireSafety 관제</span>
      </div>
      <p class="subtitle">비밀번호 재설정 요청</p>

      <template v-if="!submitted">
        <label class="field-label">이메일</label>
        <input
          v-model="email"
          type="email"
          placeholder="you@email.com"
          class="field-input"
          autocomplete="username"
          @keyup.enter="submit"
        />
        <button class="btn btn-primary btn-block" :disabled="loading || !email" @click="submit">
          {{ loading ? '요청 중...' : '재설정 링크 요청' }}
        </button>
      </template>
      <div v-else class="banner banner-info">{{ resultMessage }}</div>

      <p class="footnote"><router-link to="/login">로그인으로 돌아가기</router-link></p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
}
.login-card {
  width: 360px;
  padding: 32px;
  color: var(--color-text);
}
.brand {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  font-weight: 700;
  font-size: 18px;
}
.dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--color-success);
}
.subtitle {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 6px 0 24px;
}
.btn-block {
  width: 100%;
}
.footnote {
  text-align: center;
  font-size: 11px;
  color: var(--color-text-muted);
  margin-top: 20px;
}
.footnote a {
  color: var(--color-text);
}
</style>
