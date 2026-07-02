import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// מזהה בנייה - מוזרק בזמן build ומוצג באפליקציה כדי לוודא איזו גרסה נטענה
const BUILD_ID = new Date().toISOString().slice(0, 16).replace('T', ' ');

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(BUILD_ID),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // נרשום את ה-Service Worker ידנית (src/pwa.ts) כדי לבצע בדיקות עדכון
      // תקופתיות - קריטי ב-iOS PWA שם הקאש דביק והעדכון לא מגיע מעצמו
      injectRegister: false,
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
