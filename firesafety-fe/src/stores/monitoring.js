import { defineStore } from 'pinia'
import { ref } from 'vue'

// DefaultLayout/MobileLayout 헤더의 통신상태·미확인알림수를 여기서 공유.
// 실제 값은 DashboardView가 WebSocket/REST 로드 시점에 채워 넣음(프론트가이드 8절).
export const useMonitoringStore = defineStore('monitoring', () => {
  const wsConnected = ref(false)
  const unreadAlertCount = ref(0)

  function setWsConnected(v) { wsConnected.value = v }
  function setUnreadAlertCount(v) { unreadAlertCount.value = v }

  return { wsConnected, unreadAlertCount, setWsConnected, setUnreadAlertCount }
})
