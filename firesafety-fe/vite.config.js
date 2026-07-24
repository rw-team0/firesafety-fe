import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    // 모바일(PWA) 전용. manifest.json/서비스워커는 직접 안 만들고 빌드 시점에 자동 생성됨(프론트가이드 7절)
    VitePWA({
      manifest: {
        name: 'ArcGuard',
        short_name: 'ArcGuard',
        start_url: '/m/dashboard',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ec221f',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: '/index.html', // SPA 라우팅 대응
        navigateFallbackDenylist: [/^\/api/, /^\/swagger/], // API/Swagger는 fallback 제외
        globPatterns: ['**/*.{js,css,html,png,svg}'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        //target: 'http://localhost:8080', // 실제 백엔드 주소로 변경
        target: 'http://192.168.0.59:8080', // 실제 백엔드 주소로 변경
        changeOrigin: true,
      },
      '/ws': {
        //target: 'http://localhost:8080',
        target: 'ws://192.168.0.59:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
  // vite preview(npm run build 결과 로컬 확인용)는 server.proxy를 재사용하지 않아서 따로 필요함.
  // PWA 서비스워커는 HTTPS 또는 localhost에서만 등록되므로, PWA 테스트는 build+preview로만 가능
  preview: {
    port: 4173,
    proxy: {
      '/api': {
        target: 'http://192.168.0.59:8080',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://192.168.0.59:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
