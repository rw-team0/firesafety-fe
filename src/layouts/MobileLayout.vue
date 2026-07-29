<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useMonitoringStore } from '../stores/monitoring'
import { ROLE_LABEL } from '../constants/roles'
import MobileModal from '../components/MobileModal.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const monitoring = useMonitoringStore()
const showLogoutConfirm = ref(false)
const riskPopupInfoRows = computed(() => {
  const popup = monitoring.riskPopup
  if (!popup) return []

  const circuitLabel = popup.circuitName ?? (popup.circuitNo != null ? `채널 ${popup.circuitNo}` : '-')
  return [
    { label: '장비명', value: popup.panelName ?? '-' },
    { label: '회로', value: circuitLabel },
    { label: '상태', value: '위험' },
  ]
})

// 레이아웃은 로그인 세션 내내 떠있어서(자식 화면만 바뀜) 위험 감지를 여기서 한 번만 시작
onMounted(() => monitoring.start())

const tabs = [
  { name:'alerts-mobile', path:'/m/alerts', label:'알림 이력' },
  { name:'dashboard-mobile', path:'/m/dashboard', label:'대시보드' },
]
function doLogout(){
  showLogoutConfirm.value = false
  auth.logout().then(() => router.push('/m/login'))
}
function goToPanel() {
  const panelId = monitoring.riskPopup?.panelId
  monitoring.clearRiskPopup()
  if (panelId != null) {
    monitoring.confirmLatestAlertForPanel(panelId).catch(() => {})
  }
  router.push('/m/dashboard') // 모바일은 장비 상세 화면(S-001~003)이 없어서 대시보드로만 이동
}
</script>

<template>
  <div style="display:flex;flex-direction:column;height:100vh;">
    <header style="padding:16px 16px;display:flex;align-items:center;gap:10px;font-size:11px;flex:none;color:var(--color-text-muted);">
      <img src="/arcguard.png" alt="ArcGuard" style="width:32px;height:32px;border-radius:8px;" />
      <span style="font-weight:700;color:var(--color-text);font-size:15px;">ArcGuard</span>
      <span :style="{ color: monitoring.wsConnected ? 'var(--color-success)' : 'var(--color-offline)' }">● 통신 {{ monitoring.wsConnected ? '정상' : '두절' }}</span>
      <span style="margin-left:auto;">미확인 알림 {{ monitoring.unreadAlertCount }}</span>
      <span>이름 : {{ auth.user?.name }} 권한: {{ ROLE_LABEL[auth.role] ?? auth.role }}</span>
    </header>
    <main style="flex:1;overflow-y:auto;"><router-view :key="$route.fullPath" /></main>
    <nav style="display:flex;border-top:1px solid var(--color-border);flex:none;">
      <router-link
        v-for="t in tabs" :key="t.name" :to="t.path"
        :style="{flex:1,textAlign:'center',padding:'14px 4px',fontSize:'11.5px',color:'var(--color-text)',textDecoration:'none',
          borderTop: route.name===t.name ? '2px solid var(--color-accent)' : '2px solid transparent'}"
      >{{ t.label }}</router-link>
      <button type="button" class="mobile-nav-logout" @click="showLogoutConfirm = true">로그아웃</button>
    </nav>

    <MobileModal
      :visible="showLogoutConfirm"
      title="로그아웃"
      message="로그아웃 하시겠습니까?"
      confirm-text="확인"
      cancel-text="취소"
      @confirm="doLogout"
      @cancel="showLogoutConfirm = false"
    />

    <!-- 위험 등급 전환 팝업. 레이아웃에 있어서 대시보드/알림이력 어느 화면이든 뜬다 -->
    <MobileModal
      :visible="!!monitoring.riskPopup"
      type="danger"
      title="위험 발생"
      :message="`${monitoring.riskPopup?.panelName ?? '-'}에서 위험 상태가 감지되었습니다.`"
      :info-rows="riskPopupInfoRows"
      note-text="상세보기 시 바로 해당 알림이 확인 처리 됩니다."
      confirm-text="확인"
      cancel-text="닫기"
      @confirm="goToPanel"
      @cancel="monitoring.clearRiskPopup()"
    />
  </div>
</template>

<style scoped>
.mobile-nav-logout {
  flex: 1;
  padding: 14px 4px;
  border: none;
  border-top: 2px solid transparent;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: 11.5px;
  text-align: center;
  cursor: pointer;
}
</style>
