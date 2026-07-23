// FCM 백그라운드 알림 수신용 (프론트가이드 7.5절). vite-plugin-pwa가 만드는 서비스워커와는 별개 파일.
// 서비스워커는 정적 파일이라 import.meta.env를 못 씀 — Firebase 웹 config는 공개해도 안전한 값들이라
// 아래 그대로 하드코딩함. 실제 프로젝트 값으로 채워야 동작함(src/utils/fcm.js의 VITE_FIREBASE_* 와 동일한 값).
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {}
  self.registration.showNotification(title ?? '경보 발생', {
    body: body ?? '',
    icon: '/icons/icon-192.png',
  })
})
