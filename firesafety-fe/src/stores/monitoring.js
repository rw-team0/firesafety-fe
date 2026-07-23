import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import httpRequester from '../utils/httpRequester'
import { createMonitoringSocket } from '../utils/monitoringSocket'
import { useAuthStore } from './auth'

// 실시간 관제 상태(통신상태/미확인알림/위험전환 팝업)를 앱 전체에서 공유.
// 예전엔 DashboardView 안에서만 WS를 연결해서 대시보드를 벗어나면 위험 팝업/경보음이 전혀 안 울렸음 —
// 로그인 세션 내내 떠있는 레이아웃(DefaultLayout/MobileLayout)에서 한 번만 연결해서
// 어느 화면에 있든 위험 전환을 감지하게 옮김.
export const useMonitoringStore = defineStore('monitoring', () => {
  const wsConnected = ref(false)
  const unreadAlertCount = ref(0)
  const summary = ref(null)
  const riskPopup = ref(null)
  const refreshedAt = ref(0) // 값이 바뀔 때마다 다른 화면이 자기 화면용 부가 데이터를 다시 불러오게 하는 신호

  const panelGrid = computed(() => summary.value?.panels ?? [])

  let socket = null
  let pollTimer = null
  let started = false

  // 웹은 팝업+경보음(프론트가이드 7.5절). Web Audio로 짧은 비프음만 재생 —
  // 브라우저 자동재생 정책 때문에 실패할 수 있어 방어적으로 감싸둠
  function playAlertBeep() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)()
      const osc = ctx.createOscillator()
      osc.frequency.value = 880
      osc.connect(ctx.destination)
      osc.start()
      setTimeout(() => { osc.stop(); ctx.close() }, 200)
    } catch (e) {
      // 자동재생 차단 등은 무시 — 팝업 자체는 뜨니 치명적이지 않음
    }
  }

  async function loadSummary() {
    try {
      const res = await httpRequester.get('/dashboard/summary', { params: {} })
      return res.data.resultData
    } catch (e) {
      // 실패 알림은 인터셉터가 이미 띄웠음
      return null
    }
  }

  // 백엔드팀 API 가이드 6절: WS 메시지엔 panelId/status 상세 데이터가 없고
  // { eventType, occurredAt } 새로고침 신호만 옴 — 받으면 REST로 다시 조회해서 비교
  async function refresh() {
    const previousRiskIds = new Set(panelGrid.value.filter((p) => p.status === 'RISK').map((p) => p.panelId))
    const data = await loadSummary()
    if (!data) return
    summary.value = data
    unreadAlertCount.value = data.unconfirmedAlertCount ?? 0
    refreshedAt.value = Date.now()

    const newRisk = panelGrid.value.find((p) => p.status === 'RISK' && !previousRiskIds.has(p.panelId))
    if (newRisk) {
      riskPopup.value = { panelId: newRisk.panelId, panelName: newRisk.name }
      playAlertBeep()
    }
  }

  function startPolling() {
    if (pollTimer) return
    pollTimer = setInterval(refresh, 15000) // NFR-14: WS 끊기면(또는 애초에 미사용이면) REST 폴링으로 전환
  }
  function stopPolling() {
    clearInterval(pollTimer)
    pollTimer = null
  }

  // 로그인 세션 동안 딱 한 번만 연결(레이아웃이 마운트될 때마다 중복 연결되지 않게 가드)
  async function start() {
    if (started) return
    started = true
    await refresh()

    const auth = useAuthStore()
    // API 가이드 6절: SUPER_ADMIN은 이 topic을 쓰지 않음(REST 전체조회로만 동작) — 폴링만 사용
    if (auth.role === 'SUPER_ADMIN') {
      wsConnected.value = true
      startPolling()
      return
    }
    // site-assignments는 ADMIN 이상만 호출 가능한 관리용 API라 GENERAL이 부르면 403.
    // 본인 담당 현장만 필요하면 되므로 이미 역할별로 스코프되는 /sites를 사용한다.
    const sitesRes = await httpRequester.get('/sites')
    const siteIds = sitesRes.data.resultData.map((s) => s.siteId)
    socket = createMonitoringSocket({
      siteIds,
      onMessage: refresh,
      onConnect: () => { wsConnected.value = true; stopPolling() },
      onDisconnect: () => { wsConnected.value = false; startPolling() },
    })
    if (!siteIds.length) startPolling() // 담당 현장이 없으면 구독할 topic도 없음 — 폴링으로만 동작
  }

  function clearRiskPopup() {
    riskPopup.value = null
  }

  function setWsConnected(v) { wsConnected.value = v }
  function setUnreadAlertCount(v) { unreadAlertCount.value = v }

  return {
    wsConnected,
    unreadAlertCount,
    summary,
    panelGrid,
    riskPopup,
    refreshedAt,
    start,
    refresh,
    clearRiskPopup,
    setWsConnected,
    setUnreadAlertCount,
  }
})
