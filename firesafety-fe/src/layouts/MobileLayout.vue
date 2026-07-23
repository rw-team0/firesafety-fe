<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useMonitoringStore } from '../stores/monitoring'
import ConfirmModal from '../components/ConfirmModal.vue'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const monitoring = useMonitoringStore()
const showLogoutConfirm = ref(false)

// 레이아웃은 로그인 세션 내내 떠있어서(자식 화면만 바뀜) 위험 감지를 여기서 한 번만 시작
onMounted(() => monitoring.start())

const tabs = [
  { name:'dashboard-mobile', path:'/m/dashboard', label:'대시보드' },
  { name:'alerts-mobile', path:'/m/alerts', label:'알림 이력' },
]
function doLogout(){
  showLogoutConfirm.value = false
  auth.logout().then(() => router.push('/m/login'))
}
function goToPanel() {
  monitoring.clearRiskPopup()
  router.push('/m/dashboard') // 모바일은 장비 상세 화면(S-001~003)이 없어서 대시보드로만 이동
}
</script>

<template>
  <div style="display:flex;flex-direction:column;height:100vh;">
    <header style="padding:8px 14px;display:flex;align-items:center;gap:8px;font-size:11px;flex:none;color:var(--color-text-muted);">
      <img src="/arcguard.png" alt="ArcGuard" style="width:18px;height:18px;border-radius:4px;" />
      <span style="font-weight:700;color:var(--color-text);">ArcGuard</span>
      <span :style="{ color: monitoring.wsConnected ? 'var(--color-success)' : 'var(--color-offline)' }">● 통신 {{ monitoring.wsConnected ? '정상' : '두절' }}</span>
      <span style="margin-left:auto;">미확인 알림 {{ monitoring.unreadAlertCount }}</span>
      <span>{{ auth.user?.name }} {{ auth.role }}</span>
    </header>
    <main style="flex:1;overflow-y:auto;"><router-view :key="$route.fullPath" /></main>
    <nav style="display:flex;border-top:1px solid var(--color-border);flex:none;">
      <router-link
        v-for="t in tabs" :key="t.name" :to="t.path"
        :style="{flex:1,textAlign:'center',padding:'8px 4px',fontSize:'10.5px',color:'var(--color-text)',textDecoration:'none',
          borderTop: route.name===t.name ? '2px solid var(--color-accent)' : '2px solid transparent'}"
      >{{ t.label }}</router-link>
      <div @click="showLogoutConfirm = true" style="flex:1;text-align:center;padding:8px 4px;font-size:10.5px;color:var(--color-text);cursor:pointer;">로그아웃</div>
    </nav>

    <ConfirmModal v-if="showLogoutConfirm" title="로그아웃"
      message="로그아웃 하시겠습니까?"
      @confirm="doLogout" @cancel="showLogoutConfirm = false" />

    <!-- 위험 등급 전환 팝업. 레이아웃에 있어서 대시보드/알림이력 어느 화면이든 뜬다 -->
    <div v-if="monitoring.riskPopup" class="modal-overlay" @click.self="monitoring.clearRiskPopup()">
      <div class="modal-panel">
        <div class="modal-header danger">위험 발생</div>
        <div class="modal-body">
          <p>{{ monitoring.riskPopup.panelName }}에서 위험 상태가 감지되었습니다.</p>
          <div class="modal-actions">
            <button class="btn btn-primary" @click="goToPanel()">확인</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>