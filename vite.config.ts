import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon.svg'],
      workbox: {
        // אל תתן ל-Service Worker לחטוף נתיבים שמורים של Firebase Auth
        // (/__/auth/handler וכו') - חובה כדי שהתחברות Google (redirect) תעבוד
        navigateFallbackDenylist: [/^\/__\//],
      },
      manifest: {
        name: 'משימות המשפחה',
        short_name: 'משימות',
        description: 'אפליקציית ניהול משימות ביתיות למשפחה',
        theme_color: '#4f46e5',
        background_color: '#f8fafc',
        display: 'standalone',
        dir: 'rtl',
        lang: 'he',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    host: true,
  },
});
