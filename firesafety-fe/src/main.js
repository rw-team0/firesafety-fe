import { createApp } from 'vue'
import { createPinia } from 'pinia'

import './assets/design-system.css'
import App from './App.vue'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// npm run dev:mock(VITE_USE_MOCK=true)일 때만 MSW로 백엔드 없이 화면 확인 — 일반 dev/build엔 영향 없음
async function enableMocking() {
  if (import.meta.env.VITE_USE_MOCK !== 'true') return
  const { worker } = await import('./mocks/browser')
  return worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  app.mount('#app')
})
