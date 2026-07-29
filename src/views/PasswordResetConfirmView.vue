<script setup>
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import httpRequester from '../utils/httpRequester'

const route = useRoute()
const token = route.query.token ?? ''

const newPassword = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const submitted = ref(false)
const resultMessage = ref('')
const errorMessage = ref('')

// 엔드포인트/필드명(token, newPassword)은 두 가이드에 명시가 없어 CLAUDE.md의 기존 가정을 그대로 사용
async function submit() {
  errorMessage.value = ''
  if (!newPassword.value || !confirmPassword.value) {
    errorMessage.value = '새 비밀번호를 입력해주세요'
    return
  }
  if (newPassword.value !== confirmPassword.value) {
    errorMessage.value = '비밀번호가 일치하지 않습니다'
    return
  }
  loading.value = true
  try {
    const res = await httpRequester.post('/auth/password-reset/confirm', {
      token,
      newPassword: newPassword.value,
    })
    resultMessage.value = res.data.resultMessage
    submitted.value = true
  } catch (e) {
    errorMessage.value = e.response?.data?.resultMessage ?? '비밀번호 재설정에 실패했습니다.'
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
      <p class="subtitle">새 비밀번호 설정</p>

      <div v-if="!token" class="banner banner-danger">유효하지 않은 링크입니다. 재설정을 다시 요청해주세요.</div>

      <template v-else-if="!submitted">
        <div v-if="errorMessage" class="banner banner-danger">{{ errorMessage }}</div>

        <label class="field-label">새 비밀번호</label>
        <input
          v-model="newPassword"
          type="password"
          placeholder="••••••••"
          class="field-input"
          autocomplete="new-password"
          @keyup.enter="submit"
        />

        <label class="field-label">새 비밀번호 확인</label>
        <input
          v-model="confirmPassword"
          type="password"
          placeholder="••••••••"
          class="field-input"
          autocomplete="new-password"
          @keyup.enter="submit"
        />

        <button class="btn btn-primary btn-block" :disabled="loading" @click="submit">
          {{ loading ? '처리 중...' : '비밀번호 변경' }}
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
