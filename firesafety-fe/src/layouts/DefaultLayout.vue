<script setup>
import { ref } from 'vue'
import { ROLE_RANK } from '../constants/roles'

const sidebarOpen = ref(false)
function toggleSidebar() { sidebarOpen.value = !sidebarOpen.value }
function closeSidebar() { sidebarOpen.value = false }

// TODO: Pinia auth store 붙이면 이 줄을 authStore.role로 교체
// 지금은 테스트용으로 여기 값만 바꿔가며 화면 확인 (GENERAL/ADMIN/SUPER_ADMIN)
const currentRole = 'GENERAL'

const navGroups = [
  { title: '관제', items: [
    { name: 'dashboard', label: '대시보드', minRole: 'GENERAL' },
    { name: 'equipment-list', label: '설비 목록', minRole: 'GENERAL' },
    { name: 'alerts', label: '알림 이력', minRole: 'GENERAL' },
  ]},
  { title: '통계', items: [
    { name: 'statistics', label: '통계/리포트', minRole: 'GENERAL' },
  ]},
  { title: '관리', items: [
    { name: 'panel-register', label: '설비 관리', minRole: 'ADMIN' },
    { name: 'account-list', label: '계정 관리', minRole: 'SUPER_ADMIN' },
    { name: 'settings', label: '설정', minRole: 'GENERAL' },
  ]},
]

function isAllowed(item) {
  return ROLE_RANK[currentRole] >= ROLE_RANK[item.minRole]
}
</script>

<template>
  <div style="min-height:100vh;">
    <!-- 사이드바 뒤 어두운 배경막: 클릭하면 닫힘 -->
    <div
      v-if="sidebarOpen"
      @click="closeSidebar"
      style="position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:40;"
    ></div>

    <!-- 사이드바: 화면 흐름에서 완전히 빠져나와(position:fixed) 본문 위에 겹침 -->
    <aside
      :style="{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100vh',
        width: '220px',
        background: '#16223A',
        color: '#fff',
        padding: '16px',
        zIndex: 50,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.2s ease',
      }"
    >
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <span style="font-weight:700;">FireSafety</span>
        <button @click="closeSidebar" style="background:none;border:none;color:#93A1BE;font-size:16px;cursor:pointer;">✕</button>
      </div>
      <div v-for="group in navGroups" :key="group.title" style="margin-bottom:16px;">
  <div style="font-size:11px;color:#93A1BE;margin-bottom:6px;">{{ group.title }}</div>

  <template v-for="item in group.items" :key="item.name">
    <router-link
      v-if="isAllowed(item)"
      :to="{ name: item.name }"
      @click="closeSidebar"
      style="display:block;padding:8px;color:#E8ECF6;text-decoration:none;border-radius:6px;"
    >{{ item.label }}</router-link>

    <span
      v-else
      :title="`${item.label} — 이 메뉴는 상위 권한이 필요합니다`"
      style="display:flex;justify-content:space-between;padding:8px;color:#5B6884;border-radius:6px;cursor:not-allowed;"
    >
      <span>{{ item.label }}</span>
      <span style="font-size:11px;">🔒</span>
    </span>
  </template>
</div>
    </aside>

    <!-- 본문: 사이드바 상태와 무관하게 항상 폭 그대로 -->
    <div style="display:flex;flex-direction:column;min-height:100vh;">
      <header style="padding:14px 20px;border-bottom:1px solid #eee;display:flex;align-items:center;gap:14px;">
        <button
          @click="toggleSidebar"
          aria-label="메뉴 열기"
          style="background:none;border:none;font-size:18px;cursor:pointer;padding:4px 8px;"
        >☰</button>
        <span>헤더 (알림/유저정보 자리)</span>
      </header>
      <main style="flex:1;"><router-view /></main>
    </div>
  </div>
</template>