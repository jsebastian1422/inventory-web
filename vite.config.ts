import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // La ilustracion de fondo se precachea para que el login se vea igual sin conexion.
        globPatterns: ['**/*.{js,css,html,svg}'],
        // La sesion (/auth/*) nunca se cachea ni se sirve desde el service worker (ADR-0007).
        navigateFallbackDenylist: [/^\/auth\//],
        runtimeCaching: [
          { urlPattern: ({ url }) => url.pathname.startsWith('/auth/'), handler: 'NetworkOnly' },
        ],
      },
      manifest: {
        lang: 'es',
        name: 'Inventario',
        short_name: 'Inventario',
        description: 'Sistema de inventario, ventas y facturacion',
        theme_color: '#1f2937',
        background_color: '#f3f4f6',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { environment: 'jsdom', include: ['src/**/*.test.ts'] },
})
