<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const errorMessage = ref('')
const loading = ref(false)
const sessionExpiredBanner = ref(false)
async function handleLogin() {
  if (!email.value || !password.value) {
    errorMessage.value = 'ID 또는 PW를 입력해주세요.' // 이건 서버 호출 전 클라이언트 검증이라 그대로 유지
    return
  }
  loading.value = true
  try {
    await auth.login(email.value, password.value)
    router.push('/dashboard')
  } catch (e) {
    // 401 메시지("ID 또는 PW가 일치하지 않습니다")는 인터셉터가 이미 alert로 띄웠음
    // 여기 catch는 "로딩 스피너를 꺼야 한다"는 이 화면만의 후처리를 위해서만 존재
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="brand">
        <span class="dot"></span>
        <span>FireSafety 관제</span>
      </div>
      <p class="subtitle">전기화재 방지 스마트 진단/분석 모니터링</p>
      <div v-if="sessionExpiredBanner" class="banner-warn">로그인이 필요합니다.</div>
      <div v-if="errorMessage" class="error-banner">{{ errorMessage }}</div>

      <label class="field-label">이메일</label>
      <input
        v-model="email"
        type="email"
        placeholder="you@email.com"
        class="field-input"
        @keyup.enter="handleLogin"
      />

      <label class="field-label">비밀번호</label>
      <input
        v-model="password"
        type="password"
        placeholder="••••••••"
        class="field-input"
        @keyup.enter="handleLogin"
      />

      <button class="login-btn" :disabled="loading" @click="handleLogin">
        {{ loading ? '로그인 중...' : '로그인' }}
      </button>
      <input type="checkbox">ID/PW 저장
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
  background: radial-gradient(circle at 30% 20%, #132038, #0A1220);
}
.login-card {
  width: 360px;
  background: #16223A;
  border: 1px solid #243452;
  border-radius: 12px;
  padding: 32px;
  color: #E8ECF6;
  font-family: -apple-system, sans-serif;
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
  background: #22D3C5;
  box-shadow: 0 0 10px #22D3C5;
}
.subtitle {
  text-align: center;
  font-size: 12px;
  color: #93A1BE;
  margin: 6px 0 24px;
}
.field-label {
  display: block;
  font-size: 12px;
  color: #93A1BE;
  margin-bottom: 6px;
}
.field-input {
  width: 100%;
  background: #1C2A45;
  border: 1px solid #243452;
  border-radius: 8px;
  color: #fff;
  padding: 10px 12px;
  font-size: 14px;
  margin-bottom: 16px;
  box-sizing: border-box;
}
.field-input:focus {
  outline: none;
  border-color: #22D3C5;
}
.login-btn {
  width: 100%;
  padding: 11px;
  background: #22D3C5;
  border: none;
  border-radius: 8px;
  color: #04211D;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
}
.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.error-banner {
  background: rgba(239, 75, 84, 0.14);
  border: 1px solid rgba(239, 75, 84, 0.35);
  color: #FFD3D5;
  font-size: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  margin-bottom: 16px;
}
.footnote {
  text-align: center;
  font-size: 11px;
  color: #5B6884;
  margin-top: 20px;
}
</style>