<script setup>
import { ref } from 'vue'
import { ROLE_RANK } from '../constants/roles'
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const router = useRouter()
const auth = useAuthStore()
const sidebarOpen = ref(true)  // 기본 열림 (레퍼런스 기준)
function toggleSidebar() { sidebarOpen.value = !sidebarOpen.value }

const navGroups = [
  { title:'관제', items:[
    { name:'dashboard', label:'대시보드', minRole:'GENERAL' },
    { name:'equipment-list', label:'설비 목록', minRole:'GENERAL' },
    { name:'alerts', label:'알림 이력', minRole:'GENERAL' },
  ]},
  { title:'통계', items:[{ name:'statistics', label:'통계/리포트', minRole:'GENERAL' }] },
  { title:'관리', items:[
    { name:'panel-register', label:'설비 관리', minRole:'ADMIN' },
    { name:'account-list', label:'계정 관리', minRole:'SUPER_ADMIN' },
  ]},
]
function isAllowed(item){ return ROLE_RANK[auth.role] >= ROLE_RANK[item.minRole] }
function handleLogout(){
  if (!confirm('로그아웃 하시겠습니까?')) return  // TODO: 아래 3번에서 만들 모달로 교체
  auth.logout().then(() => router.push('/login'))
}
</script>

<template>
  <div style="display:flex;flex-direction:column;height:100vh;">
    <!-- 헤더: 항상 전체 폭, 통신상태·미확인알림·로그아웃 표시 -->
    <header style="padding:10px 16px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:14px;flex:none;">
      <button @click="toggleSidebar" aria-label="메뉴">☰</button>
      <span>FireSafety</span>
      <span style="color:green;font-size:12px;">통신상태: 정상</span>
      <span style="margin-left:auto;font-size:12px;">미확인 알림 {{ /* TODO: store에서 카운트 */ 0 }}</span>
      <span>{{ auth.user?.name }} {{ auth.role }}</span>
      <button @click="handleLogout">로그아웃</button>
    </header>

    <!-- 사이드바+본문: 사이드바 폭이 실제로 레이아웃을 차지 → 열리면 본문이 밀려서 축소됨(오버레이 아님) -->
    <div style="flex:1;display:flex;min-height:0;">
      <aside :style="{ width: sidebarOpen ? '200px' : '0px', overflow:'hidden', transition:'width .2s ease', background:'#16223A' }">
        <div style="width:200px;padding:14px 10px;box-sizing:border-box;">
          <div v-for="group in navGroups" :key="group.title" style="margin-bottom:16px;">
            <div style="font-size:11px;color:#93A1BE;margin-bottom:6px;">{{ group.title }}</div>
            <template v-for="item in group.items" :key="item.name">
              <router-link
                v-if="isAllowed(item)"
                :to="{ name: item.name }"
                style="display:block;padding:8px;color:#E8ECF6;text-decoration:none;border-radius:6px;"
              >{{ item.label }}</router-link>
              <span v-else style="display:flex;justify-content:space-between;padding:8px;color:#5B6884;">
                {{ item.label }}<span>🔒</span>
              </span>
            </template>
          </div>
        </div>
      </aside>
      <main style="flex:1;min-width:0;overflow-y:auto;padding:22px;"><router-view /></main>
    </div>
  </div>
</template>