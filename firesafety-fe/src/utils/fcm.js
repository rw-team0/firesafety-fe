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
  const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js')
  const fcmToken = await getToken(messaging, {
    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  })
  if (!fcmToken) return

  await httpRequester.patch('/users/me/fcm-token', { fcmToken }) // API-007
}
