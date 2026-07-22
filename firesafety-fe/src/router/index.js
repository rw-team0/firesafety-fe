// import { createRouter, createWebHistory } from 'vue-router'

// const router = createRouter({
//   history: createWebHistory(import.meta.env.BASE_URL),
//   routes: [],
// })

// export default router

import { createRouter, createWebHistory } from 'vue-router'
import routes from './routes'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

// const ROLE_RANK = { SUPER_ADMIN: 3, ADMIN: 2, GENERAL: 1 }
import { ROLE_RANK } from '../constants/roles'

router.beforeEach((to) => {
  const required = to.meta.requiredRole
  if (!required) return true // 로그인 화면처럼 권한 필요 없는 라우트

  // TODO: Pinia auth store 붙이면 아래 mock 대신 실제 로그인 상태 참조
  const isLoggedIn = true // 로그인 상태
  const currentRole = 'SUPER_ADMIN' //권한

  if (!isLoggedIn) return to.path.startsWith('/m') ? '/m/login' : '/login'
  if (ROLE_RANK[currentRole] < ROLE_RANK[required]) return to.path.startsWith('/m') ? '/m/dashboard' : '/dashboard'
  return true
})

export default router