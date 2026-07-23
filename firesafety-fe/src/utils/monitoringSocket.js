import { Client } from '@stomp/stompjs'

// 프론트가이드 8절: 모니터링 메인(S-002) 진입 시 최초 1회 REST 로드 후 WebSocket(STOMP, /ws/monitoring) 연결,
// 이후 상태변경은 WS 이벤트로만 수신. 구독 destination('/topic/monitoring')은 백엔드 문서에 명시가 없어 가정값 —
// 실제 destination이 다르면 여기만 고치면 됨.
const SUBSCRIBE_DESTINATION = '/topic/monitoring'

export function createMonitoringSocket({ onMessage, onConnect, onDisconnect }) {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws'
  const client = new Client({
    brokerURL: `${proto}://${location.host}/ws/monitoring`,
    reconnectDelay: 5000,
    onConnect: () => {
      onConnect?.()
      client.subscribe(SUBSCRIBE_DESTINATION, (message) => {
        try {
          onMessage?.(JSON.parse(message.body))
        } catch (e) {
          // 파싱 실패한 프레임은 무시(원본 로그는 백엔드 쪽에서 별도 보관)
        }
      })
    },
    onWebSocketClose: () => onDisconnect?.(),
    onStompError: () => onDisconnect?.(),
  })
  client.activate()
  return client // 호출부에서 client.deactivate()로 정리
}
