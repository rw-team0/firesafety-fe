import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import apiClient from '../api/client'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(JSON.parse(sessionStorage.getItem('user') || 'null'))
  const isLoggedIn = computed(() => !!user.value)
  const role = computed(() => user.value?.role ?? null)

  function setUser(u) {
    user.value = u
    sessionStorage.setItem('user', JSON.stringify(u)) // 토큰(X) — 이름/역할만 캐싱
  }
  function clear() {
    user.value = null
    sessionStorage.removeItem('user')
  }

  async function login(email, password) {
    const res = await apiClient.post('/api/auth/login', { email, password }) // API-001
    const { userId, name, role } = res.data.resultData
    setUser({ userId, name, role }) // accessToken/refreshToken은 서버가 쿠키로 이미 심어줌 → JS가 따로 저장할 필요 없음
  }

  async function logout() {
    try { await apiClient.post('/api/auth/logout') } catch (e) { /* API-002는 멱등 처리라 실패해도 무시 */ }
    clear()
  }

  return { user, isLoggedIn, role, login, logout, setUser, clear }
})