import { Client } from '@stomp/stompjs'

// 백엔드팀 API 가이드(2026-07-23, 프론트엔드 공유용) 확인 결과:
// - 구독 destination은 현장별(`/topic/sites/{siteId}/monitoring`)이지 공용 `/topic/monitoring`이 아님
// - 메시지엔 panelId/status 같은 상세 데이터가 없고 { eventType, occurredAt } 새로고침 신호만 옴
//   (eventType: SENSOR_FRAME_RECEIVED/ALERT_CREATED 등) — 받으면 REST로 다시 조회해야 함
// - SUPER_ADMIN은 이 topic 자체를 쓰지 않음(REST 전체조회로만 동작), ADMIN/GENERAL만 본인 담당 현장 topic 구독
export function createMonitoringSocket({ siteIds, onMessage, onConnect, onDisconnect }) {
  if (!siteIds?.length) return null
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const client = new Client({
    brokerURL: `${proto}://${location.host}/ws/monitoring`,
    reconnectDelay: 5000,
    onConnect: () => {
      onConnect?.()
      siteIds.forEach((siteId) => {
        client.subscribe(`/topic/sites/${siteId}/monitoring`, (message) => {
          try {
            onMessage?.(JSON.parse(message.body))
          } catch (e) {
            // 파싱 실패한 프레임은 무시(원본 로그는 백엔드 쪽에서 별도 보관)
          }
        })
      })
    },
    onWebSocketClose: () => onDisconnect?.(),
    onStompError: () => onDisconnect?.(),
  })
  client.activate()
  return client // 호출부에서 client.deactivate()로 정리
}
