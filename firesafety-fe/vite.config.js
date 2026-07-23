import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
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
        target: 'http://192.168.0.31:8080', // 실제 백엔드 주소로 변경
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://192.168.0.31:8080',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
