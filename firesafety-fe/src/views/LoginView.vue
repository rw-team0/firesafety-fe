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
  // ID 저장(프론트가이드 5.2절): 비밀번호는 저장하지 않고 이메일만 localStorage에 보관
  const savedEmail = localStorage.getItem('savedEmail')
  if (savedEmail) {
    email.value = savedEmail
    saveId.value = true
  }
})

async function handleLogin() {
  if (!email.value || !password.value) {
    errorMessage.value = 'ID 또는 PW를 입력해주세요' // 이건 서버 호출 전 클라이언트 검증이라 그대로 유지
    return
  }
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    if (saveId.value) localStorage.setItem('savedEmail', email.value)
    else localStorage.removeItem('savedEmail')
    // FCM은 모바일 PWA 전용(프론트가이드 7.5절) — 실패해도 로그인 자체는 막지 않도록 fire-and-forget
    if (route.path.startsWith('/m')) registerFcmToken().catch(() => {})
    router.push(route.path.startsWith('/m') ? '/m/dashboard' : '/dashboard')
  } catch (e) {
    // 인터셉터의 전역 알림 모달은 그대로 유지(문서 표준, 재발급 로직으로 메시지가 덮어써질 수 있는 알려진 이슈 있음)
    // 여기선 같은 메시지를 카드 안 인라인 배너(.banner-danger)에도 띄워서 와이어프레임 형태를 맞춤
    errorMessage.value = e.response?.data?.resultMessage ?? '로그인에 실패했습니다.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card card">
      <div class="brand">
        <img src="/arcguard.png" alt="ArcGuard" style="width:28px;height:28px;border-radius:6px;" />
        <span>ArcGuard</span>
      </div>
      <p class="subtitle">전기화재 방지 스마트 진단/분석 모니터링</p>
      <div v-if="sessionExpiredBanner" class="banner banner-warn">세션이 만료되어 로그인이 필요합니다</div>
      <div v-if="errorMessage" class="banner banner-danger">{{ errorMessage }}</div>

      <label class="field-label">이메일</label>
      <input
        v-model="email"
        type="email"
        placeholder="you@email.com"
        class="field-input"
        autocomplete="username"
        @keyup.enter="handleLogin"
      />

      <label class="field-label">비밀번호</label>
      <input
        v-model="password"
        type="password"
        placeholder="••••••••"
        class="field-input"
        autocomplete="current-password"
        @keyup.enter="handleLogin"
      />

      <button class="btn btn-primary btn-block" :disabled="loading" @click="handleLogin">
        {{ loading ? '로그인 중...' : '로그인' }}
      </button>
      <label class="save-id-label"><input type="checkbox" v-model="saveId" />ID 저장</label>
      <p class="footnote"><router-link to="/reset-password/request">비밀번호를 잊으셨나요?</router-link></p>
      <p class="footnote">계정 발급은 상위 관리자에게 문의하세요 (자체가입 없음)</p>
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
.subtitle {
  text-align: center;
  font-size: 12px;
  color: var(--color-text-muted);
  margin: 6px 0 24px;
}
.btn-block {
  width: 100%;
}
.save-id-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-muted);
  margin-top: 12px;
  cursor: pointer;
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
