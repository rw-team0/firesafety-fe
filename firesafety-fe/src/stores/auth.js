import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import httpRequester, { setLoggingOut } from '../utils/httpRequester'
import { useMonitoringStore } from './monitoring'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(sessionStorage.getItem('user') || 'null'))
  const isLoggedIn = computed(() => !!user.value)
  const role = computed(() => user.value?.role ?? null)

  function setUser(u) { user.value = u; sessionStorage.setItem('user', JSON.stringify(u)) }
  function clear() { user.value = null; sessionStorage.removeItem('user') }

  async function login(email, password) {
    // '/api/auth/login' 이 아니라 '/auth/login' — baseURL이 '/api'를 이미 포함
    const res = await httpRequester.post('/auth/login', { email, password })
    const { userId, name, role } = res.data.resultData
    setUser({ userId, name, role })
    // 실패 시(401)는 여기서 따로 안 잡아도 됨 — 인터셉터가 이미 alert로 안내함
    // 화면(LoginView)에서 "로그인 처리중" 스피너를 꺼야 하니 호출부에선 try/finally 정도만 쓰면 충분
  }

  async function logout() {
    setLoggingOut(true)
    // 안 멈추면 세션 없이도 폴링/WS가 계속 돌면서 재발급 실패가 반복 발생한다 — 로그아웃 API 호출보다 먼저 정지시켜서
    // 그 사이에 진행 중이던 요청 자체를 최소화함
    useMonitoringStore().stop()
    try {
      await httpRequester.post('/auth/logout')
    } catch (e) { /* 멱등 처리라 실패 무시 */ }
    clear()
    setLoggingOut(false)
  }

  return { user, isLoggedIn, role, login, logout, setUser, clear }
})