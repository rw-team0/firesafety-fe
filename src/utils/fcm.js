import { initializeApp } from 'firebase/app'
import { getMessaging, getToken } from 'firebase/messaging'
import httpRequester from './httpRequester'

// FCM 웹푸시는 모바일 PWA 전용, 웹 브라우저에서는 사용하지 않음(프론트가이드 7.5절, NFR-11)
// VITE_FIREBASE_* 값은 .env에 실제 Firebase 프로젝트 설정으로 채워야 동작함(.env.example 참고)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

// 로그인 성공 후(모바일) 1회 호출: 알림 권한 요청 -> FCM 토큰 발급 -> 서버에 등록(API-007)
export async function registerFcmToken() {
  if (!firebaseConfig.apiKey) return // 실제 Firebase 설정 전이면 조용히 스킵
  if (!('Notification' in window) || !('serviceWorker' in navigator)) return

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  const app = initializeApp(firebaseConfig)
  const messaging = getMessaging(app)
  // vite-plugin-pwa가 등록하는 sw.js도 기본 scope('/')를 쓰는데, 같은 scope에 서비스워커를 또 등록하면
  // 나중에 등록된 쪽이 앞의 등록을 덮어써버림(Service Worker 스펙상 scope당 하나만 활성화됨) — Firebase
  // 공식 가이드대로 별도 scope를 줘서 PWA 서비스워커와 안 부딪히게 함
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
    scope: '/firebase-cloud-messaging-push-scope',
  })
  const fcmToken = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  })
  if (!fcmToken) return

  await httpRequester.patch('/users/me/fcm-token', { fcmToken }) // API-007
}
