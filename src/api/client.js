import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080',
  withCredentials: true, // ★ 필수: at/rt가 httpOnly 쿠키라서 이게 없으면 인증이 아예 안 됨
})

let isReissuing = false

apiClient.interceptors.response.use(
  res => res,
  async (error) => {
    const original = error.config
    const isAuthEndpoint = original?.url?.includes('/api/auth/')
    if (error.response?.status === 401 && !original._retry && !isAuthEndpoint) {
      original._retry = true
      if (!isReissuing) {
        isReissuing = true
        try {
          await apiClient.post('/api/auth/reissue') // API-026
          isReissuing = false
          return apiClient(original) // 원래 실패했던 요청 재시도
        } catch (reissueError) {
          isReissuing = false
          sessionStorage.removeItem('user')
          window.location.href = '/login?sessionExpired=1' // ★ AUTH-003가 여기서 만족됨
          return Promise.reject(reissueError)
        }
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient