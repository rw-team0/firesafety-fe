import PlaceholderView from '../views/PlaceholderView.vue'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import AuthLayout from '../layouts/AuthLayout.vue'
import MobileLayout from '../layouts/MobileLayout.vue'
import LoginView from '../views/LoginView.vue'
import AccountListView from '@/views/AccountListView.vue'
import AccountAddView from '@/views/AccountAddView.vue'
import AccountEditView from '@/views/AccountEditView.vue'

// ── 웹 라우트 ──────────────────────────────
const webRoutes = {
  path: '/',
  component: DefaultLayout,
  children: [
    { path: 'dashboard', name: 'dashboard', component: PlaceholderView, meta: { requiredRole: 'GENERAL' } },
    { path: 'alerts', name: 'alerts', component: PlaceholderView, meta: { requiredRole: 'GENERAL' } },
    { path: 'equipment', name: 'equipment-list', component: PlaceholderView, meta: { requiredRole: 'GENERAL' } },
    { path: 'equipment/:panelId', name: 'equipment-detail', component: PlaceholderView, meta: { requiredRole: 'GENERAL' } },
    { path: 'statistics', name: 'statistics', component: PlaceholderView, meta: { requiredRole: 'GENERAL' } },
    { path: 'settings', name: 'settings', component: PlaceholderView, meta: { requiredRole: 'GENERAL' } },
    { path: 'settings/sites', name: 'site-register', component: PlaceholderView, meta: { requiredRole: 'SUPER_ADMIN' } },
    { path: 'settings/panels', name: 'panel-register', component: PlaceholderView, meta: { requiredRole: 'ADMIN' } },
    { path: 'settings/circuits', name: 'circuit-register', component: PlaceholderView, meta: { requiredRole: 'ADMIN' } },
    { path: 'settings/site-assignment', name: 'site-assignment', component: PlaceholderView, meta: { requiredRole: 'ADMIN' } },
    { path: 'settings/accounts', name: 'account-list', component: AccountListView, meta: { requiredRole: 'SUPER_ADMIN' } },
    { path: 'settings/accounts/new', name: 'account-add', component: AccountAddView, meta: { requiredRole: 'ADMIN' } },
    { path: 'settings/accounts/:userId', name: 'account-edit', component: AccountEditView, meta: { requiredRole: 'ADMIN' } },
    { path: 'settings/accounts/history', name:'account-history', component: PlaceholderView, meta:{requiredRole:'SUPER_ADMIN'} },
    { path: 'settings/sites/:siteId', name:'site-edit', component: PlaceholderView, meta:{requiredRole:'SUPER_ADMIN'} },
  ],
}

// ── 웹 로그인(레이아웃 없음: 사이드바/헤더 안 보여야 함) ──
const webAuthRoutes = {
  path: '/login',
  component: AuthLayout,
//   children: [{ path: '', name: 'login', component: PlaceholderView, meta: { requiredRole: null } }],
children: [{ path: '', name: 'login', component: LoginView, meta: { requiredRole: null } }],
}

// ── 모바일 라우트 (S-001~003만 존재) ──────────
const mobileAuthRoutes = {
  path: '/m/login',
  component: AuthLayout,
  //children: [{ path: '', name: 'login-mobile', component: PlaceholderView, meta: { requiredRole: null } }],
  children: [{ path: '', name: 'login-mobile', component: LoginView, meta: { requiredRole: null } }],
}
const mobileRoutes = {
  path: '/m',
  component: MobileLayout,
  children: [
    { path: 'dashboard', name: 'dashboard-mobile', component: PlaceholderView, meta: { requiredRole: 'GENERAL' } },
    { path: 'alerts', name: 'alerts-mobile', component: PlaceholderView, meta: { requiredRole: 'GENERAL' } },
  ],
}

// export default [webAuthRoutes, webRoutes, mobileAuthRoutes, mobileRoutes]
const rootRedirect = { path: '/', redirect: '/login' }

export default [rootRedirect, webAuthRoutes, webRoutes, mobileAuthRoutes, mobileRoutes]