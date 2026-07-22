<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()

const tabs = [
  { name:'dashboard-mobile', path:'/m/dashboard', label:'대시보드' },
  { name:'alerts-mobile', path:'/m/alerts', label:'알림 이력' },
]
function handleLogout(){
  if (!confirm('로그아웃 하시겠습니까?')) return
  auth.logout().then(() => router.push('/m/login'))
}
</script>

<template>
  <div style="display:flex;flex-direction:column;height:100vh;">
    <header style="padding:8px 14px;display:flex;align-items:center;gap:10px;font-size:11px;flex:none;">
      <span style="color:green;">● 통신 정상</span>
      <span style="margin-left:auto;">미확인 알림 0</span>
      <span>{{ auth.user?.name }} {{ auth.role }}</span>
    </header>
    <main style="flex:1;overflow-y:auto;"><router-view /></main>
    <nav style="display:flex;border-top:1px solid #eee;flex:none;">
      <router-link
        v-for="t in tabs" :key="t.name" :to="t.path"
        :style="{flex:1,textAlign:'center',padding:'8px 4px',fontSize:'10.5px',
          borderTop: route.name===t.name ? '2px solid #22D3C5' : '2px solid transparent'}"
      >{{ t.label }}</router-link>
      <div @click="handleLogout" style="flex:1;text-align:center;padding:8px 4px;font-size:10.5px;cursor:pointer;">로그아웃</div>
    </nav>
  </div>
</template>