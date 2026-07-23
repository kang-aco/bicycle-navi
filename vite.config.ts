import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // 설치형 앱에서 /history, /settings 같은 주소도 새로고침 시 index.html로 처리
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // 지도 타일/고도 데이터를 캐싱해서 오프라인 대응 + 속도 향상
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/dapi\.kakao\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kakao-map-api',
              expiration: { maxEntries: 50, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/map[0-9]?\.daumcdn\.net\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'kakao-map-tiles',
              expiration: { maxEntries: 1000, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/api\.opentopodata\.org\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'elevation-data',
              expiration: { maxEntries: 200, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: 'BusanCycleNav — 부산 자전거 네비게이션',
        short_name: '부산자전거',
        description: '부산 자전거 실시간 네비게이션',
        theme_color: '#0B0F19',
        background_color: '#0B0F19',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
    }),
  ],
});
