import PlaceholderView from '../views/PlaceholderView.vue'
import DefaultLayout from '../layouts/DefaultLayout.vue'
import AuthLayout from '../layouts/AuthLayout.vue'
import MobileLayout from '../layouts/MobileLayout.vue'
import LoginView from '../views/LoginView.vue'
import AccountListView from '@/views/AccountListView.vue'
import AccountAddView from '@/views/AccountAddView.vue'
import AccountEditView from '@/views/AccountEditView.vue'
import AccountHistoryView from '@/views/AccountHistoryView.vue'
import PasswordResetRequestView from '@/views/PasswordResetRequestView.vue'
import PasswordResetConfirmView from '@/views/PasswordResetConfirmView.vue'
import SiteRegisterView from '@/views/SiteRegisterView.vue'
import PanelRegisterView from '@/views/PanelRegisterView.vue'
import CircuitRegisterView from '@/views/CircuitRegisterView.vue'
import EquipmentListView from '@/views/EquipmentListView.vue'
import EquipmentDetailView from '@/views/EquipmentDetailView.vue'
import FacilityManageView from '@/views/FacilityManageView.vue'
import DashboardView from '@/views/DashboardView.vue'
import AlertHistoryView from '@/views/AlertHistoryView.vue'
import StatisticsView from '@/views/StatisticsView.vue'
import SiteAssignmentView from '@/views/SiteAssignmentView.vue'
import MobileLoginView from '@/views/MobileLoginView.vue'
import MobileDashboardView from '@/views/MobileDashboardView.vue'
import MobileAlertView from '@/views/MobileAlertView.vue'

// ── 웹 라우트 ──────────────────────────────
//여기에 각 프론트엔드 뷰 추가(경로, 이름, 컴포넌트, 권한)
const webRoutes = {
  path: '/',
  component: DefaultLayout,
  children: [
    { path: 'dashboard', name: 'dashboard', component: DashboardView, meta: { requiredRole: 'GENERAL' } },
    { path: 'alerts', name: 'alerts', component: AlertHistoryView, meta: { requiredRole: 'GENERAL' } },
    { path: 'equipment', name: 'equipment-list', component: EquipmentListView, meta: { requiredRole: 'GENERAL' } },
    { path: 'equipment/:panelId', name: 'equipment-detail', component: EquipmentDetailView, meta: { requiredRole: 'GENERAL' } },
    { path: 'statistics', name: 'statistics', component: StatisticsView, meta: { requiredRole: 'GENERAL' } },
    { path: 'settings', name: 'settings', component: PlaceholderView, meta: { requiredRole: 'GENERAL' } },
    { path: 'settings/sites', name: 'site-register', component: SiteRegisterView, meta: { requiredRole: 'SUPER_ADMIN' } },
    { path: 'settings/panels', name: 'panel-register', component: PanelRegisterView, meta: { requiredRole: 'ADMIN' } },
    { path: 'settings/circuits', name: 'circuit-register', component: CircuitRegisterView, meta: { requiredRole: 'ADMIN' } },
    { path: 'settings/facilities', name: 'facility-manage', component: FacilityManageView, meta: { requiredRole: 'ADMIN' } },
    { path: 'settings/site-assignment', name: 'site-assignment', component: SiteAssignmentView, meta: { requiredRole: 'ADMIN' } },
    { path: 'settings/accounts', name: 'account-list', component: AccountListView, meta: { requiredRole: 'SUPER_ADMIN' } },
    { path: 'settings/accounts/new', name: 'account-add', component: AccountAddView, meta: { requiredRole: 'ADMIN' } },
    { path: 'settings/accounts/:userId', name: 'account-edit', component: AccountEditView, meta: { requiredRole: 'ADMIN' } },
    { path: 'settings/accounts/history', name:'account-history', component: AccountHistoryView, meta:{requiredRole:'SUPER_ADMIN'} },
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

// ── 비밀번호 재설정(레이아웃 없음, 로그인 불필요) ──
// 확정 경로는 백엔드 .env 기본값 PASSWORD_RESET_BASE_URL=http://localhost:5173/reset-password 기준
const passwordResetRoutes = {
  path: '/reset-password',
  component: AuthLayout,
  children: [
    { path: '', name: 'password-reset-confirm', component: PasswordResetConfirmView, meta: { requiredRole: null } },
    { path: 'request', name: 'password-reset-request', component: PasswordResetRequestView, meta: { requiredRole: null } },
  ],
}

// ── 모바일 라우트 (S-001~003만 존재) ──────────
const mobileAuthRoutes = {
  path: '/m/login',
  component: AuthLayout,
  children: [{ path: '', name: 'login-mobile', component: MobileLoginView, meta: { requiredRole: null } }],
}
const mobileRoutes = {
  path: '/m',
  component: MobileLayout,
  children: [
    { path: 'dashboard', name: 'dashboard-mobile', component: MobileDashboardView, meta: { requiredRole: 'GENERAL' } },
    { path: 'alerts', name: 'alerts-mobile', component: MobileAlertView, meta: { requiredRole: 'GENERAL' } },
  ],
}

// export default [webAuthRoutes, webRoutes, mobileAuthRoutes, mobileRoutes]
const rootRedirect = { path: '/', redirect: '/login' }

export default [rootRedirect, webAuthRoutes, passwordResetRoutes, webRoutes, mobileAuthRoutes, mobileRoutes]