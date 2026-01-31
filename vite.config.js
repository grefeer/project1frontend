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
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    proxy: {
      '/api/v1/sse': { // 单独给SSE接口配代理
        target: 'http://localhost:8080',
        changeOrigin: true,
        ws: true,
        timeout: 0, // 禁用代理超时
        keepalive: true, // 开启长连接
        // 禁用所有缓冲
        configure: (proxy) => {
          proxy.on('request', (req, res) => {
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('X-Accel-Buffering', 'no'); // 禁用nginx缓冲
          });
        }
      },
      '/api/v1': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        logLevel: 'debug' // 开启调试日志，方便排查
      }
    }
  }
})
