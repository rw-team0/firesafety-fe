<script setup>
import { ref, onMounted } from 'vue'
import { ROLE_RANK, ROLE_LABEL } from '../constants/roles'
import { useAuthStore } from '../stores/auth'
import { useMonitoringStore } from '../stores/monitoring'
import { useRouter } from 'vue-router'
import ConfirmModal from '../components/ConfirmModal.vue'

const router = useRouter()
const auth = useAuthStore()
const monitoring = useMonitoringStore()
const sidebarOpen = ref(true)  // 기본 열림 (레퍼런스 기준)
const showLogoutConfirm = ref(false)
function toggleSidebar() { sidebarOpen.value = !sidebarOpen.value }

// 레이아웃은 로그인 세션 내내 떠있어서(자식 화면만 바뀜) 위험 감지를 여기서 한 번만 시작 —
// 어느 화면(알림이력/설비목록/통계 등)에 있든 위험 팝업/경보음이 뜨게 하려는 목적
onMounted(() => monitoring.start())

function goToPanel(panelId) {
  monitoring.clearRiskPopup()
  router.push(`/equipment/${panelId}`)
}

const navGroups = [
  { title:'관제', items:[
    { name:'dashboard', label:'대시보드', minRole:'GENERAL' },
    { name:'equipment-list', label:'설비 목록', minRole:'GENERAL' },
    { name:'alerts', label:'알림 이력', minRole:'GENERAL' },
  ]},
  { title:'통계', items:[{ name:'statistics', label:'통계', minRole:'GENERAL' }] },
  { title:'관리', items:[
    { name:'facility-manage', label:'설비 관리', minRole:'ADMIN' },
    { name:'facility-audit-history', label:'설비 관리 이력', minRole:'SUPER_ADMIN' },
    { name:'account-list', label:'계정 관리', minRole:'SUPER_ADMIN' },
    { name:'account-history', label:'계정 관리 이력', minRole:'SUPER_ADMIN' },
  ]},
]
function isAllowed(item){ return ROLE_RANK[auth.role] >= ROLE_RANK[item.minRole] }
function doLogout(){
  showLogoutConfirm.value = false
  auth.logout().then(() => router.push('/login'))
}
</script>

<template>
  <div style="display:flex;flex-direction:column;height:100vh;">
    <!-- 헤더: 항상 전체 폭, 통신상태·미확인알림·로그아웃 표시 -->
    <header style="padding:10px 16px;border-bottom:1px solid var(--color-border);display:flex;align-items:center;gap:14px;flex:none;">
      <button class="btn" @click="toggleSidebar" aria-label="메뉴">☰</button>
      <img src="/arcguard.png" alt="ArcGuard" style="width:24px;height:24px;border-radius:4px;" />
      <span style="font-weight:700;">ArcGuard</span>
      <span :style="{ color: monitoring.wsConnected ? 'var(--color-success)' : 'var(--color-offline)', fontSize:'12px' }">
        통신상태: {{ monitoring.wsConnected ? '정상' : '두절' }}
      </span>
      <span style="margin-left:auto;font-size:12px;">미확인 알림 : {{ monitoring.unreadAlertCount }}</span>
      <span>이름 : {{ auth.user?.name }}</span>
      <span>권한: {{ ROLE_LABEL[auth.role] ?? auth.role }}</span>
      <button class="btn" @click="showLogoutConfirm = true">로그아웃</button>
    </header>

    <!-- 사이드바+본문: 사이드바 폭이 실제로 레이아웃을 차지 → 열리면 본문이 밀려서 축소됨(오버레이 아님) -->
    <div style="flex:1;display:flex;min-height:0;">
      <aside :style="{ width: sidebarOpen ? '200px' : '0px', overflow:'hidden', transition:'width .2s ease', background:'var(--color-bg)' }">
        <div style="width:200px;padding:14px 10px;box-sizing:border-box;">
          <div v-for="group in navGroups" :key="group.title">
            <div v-if="group.items.some(isAllowed)" style="margin-bottom:16px;">
              <div style="font-size:11px;color:var(--color-text-muted);margin-bottom:6px;">{{ group.title }}</div>
              <router-link
                v-for="item in group.items.filter(isAllowed)"
                :key="item.name"
                :to="{ name: item.name }"
                class="sidebar-link"
                style="display:block;padding:8px;text-decoration:none;border-radius:6px;"
              >{{ item.label }}</router-link>
            </div>
          </div>
        </div>
      </aside>
      <main style="flex:1;min-width:0;overflow-y:auto;padding:22px;"><router-view :key="$route.fullPath" /></main>
    </div>

    <ConfirmModal v-if="showLogoutConfirm" title="로그아웃"
      message="로그아웃 하시겠습니까?"
      @confirm="doLogout" @cancel="showLogoutConfirm = false" />

    <!-- 위험 등급 전환 팝업(프론트가이드 7.5절). 레이아웃에 있어서 어느 화면에 있든 뜬다 -->
    <div v-if="monitoring.riskPopup" class="modal-overlay" @click.self="monitoring.clearRiskPopup()">
      <div class="modal-panel">
        <div class="modal-header danger">위험 발생</div>
        <div class="modal-body">
          <p>{{ monitoring.riskPopup.panelName }}에서 위험 상태가 감지되었습니다.</p>
          <div class="modal-actions">
            <button class="btn btn-primary" @click="goToPanel(monitoring.riskPopup.panelId)">상세보기</button>
            <button class="btn" @click="monitoring.clearRiskPopup()">닫기</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sidebar-link { color: var(--color-text); }
.sidebar-link.router-link-active {
  background: var(--color-accent);
  color: #fff;
  font-weight: 700;
}
</style>