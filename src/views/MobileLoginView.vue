<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { registerFcmToken } from '../utils/fcm'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)
const sessionExpiredBanner = ref(false)
const saveId = ref(false)

onMounted(() => {
  if (route.query.expired === '1') sessionExpiredBanner.value = true
  // ID 저장(웹과 동일 정책): 비밀번호는 저장하지 않고 이메일만 localStorage에 보관
  const savedEmail = localStorage.getItem('savedEmail')
  if (savedEmail) {
    email.value = savedEmail
    saveId.value = true
  }
})

async function handleLogin() {
  if (!email.value || !password.value) {
    errorMessage.value = 'ID 또는 PW를 입력해주세요.'
    return
  }
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    if (saveId.value) localStorage.setItem('savedEmail', email.value)
    else localStorage.removeItem('savedEmail')
    registerFcmToken().catch(() => {}) // 실패해도 로그인 자체는 막지 않음(fire-and-forget)
    router.push('/m/dashboard')
  } catch (e) {
    errorMessage.value = e.response?.data?.resultMessage ?? '로그인에 실패했습니다.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="mobile-login">
    <div class="login-card">
      <div class="brand">
        <img src="/arcguard.png" alt="ArcGuard" />
        <span>ArcGuard</span>
      </div>
      <p class="subtitle">전기화재 예방 모니터링</p>

      <div v-if="sessionExpiredBanner" class="banner banner-danger">세션이 만료되어 로그인이 필요합니다.</div>
      <div v-if="errorMessage" class="banner banner-danger">{{ errorMessage }}</div>

      <label class="field-label">이메일</label>
      <input v-model="email" type="email" placeholder="you@email.com" class="field-input" @keyup.enter="handleLogin" />

      <label class="field-label">비밀번호</label>
      <input v-model="password" type="password" placeholder="••••••••" class="field-input" @keyup.enter="handleLogin" />

      <label class="save-id">
        <input type="checkbox" v-model="saveId" /> 이메일 저장
      </label>

      <button class="btn btn-primary" style="width:100%;" :disabled="loading" @click="handleLogin">
        {{ loading ? '로그인 중...' : '로그인' }}
      </button>
      <p class="footnote">계정 발급은 상위 관리자에게 문의하세요</p>
    </div>
  </div>
</template>

<style scoped>
.mobile-login {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 20px;
  box-sizing: border-box;
  background: var(--color-bg);
}
.login-card {
  width: 100%;
  max-width: 340px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 32px 24px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, .06);
}
.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.brand img { width: 48px; height: 48px; border-radius: 12px; }
.brand span { font-size: 20px; font-weight: 700; color: var(--color-text); }
.subtitle {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 6px 0 24px;
}
.save-id {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-muted);
  margin: -8px 0 16px;
}
.footnote {
  text-align: center;
  font-size: 11px;
  color: var(--color-text-muted);
  margin: 18px 0 0;
}
</style>
