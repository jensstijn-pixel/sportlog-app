import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serveert op /sportlog-app/ — vandaar de base.
export default defineConfig({
  base: '/sportlog-app/',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Eigen service worker (src/sw.ts) in plaats van een gegenereerde:
      // die heeft de app nodig om pushmeldingen te kunnen ontvangen.
      // Precachen en zelf bijwerken doet sw.ts net zo goed.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'fonts/*.woff2'],
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
      manifest: {
        name: 'Sportlog',
        short_name: 'Sportlog',
        description: 'Notities na je workout, gelezen door je ochtendbrief.',
        lang: 'nl',
        start_url: '/sportlog-app/',
        scope: '/sportlog-app/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#1e201f',
        theme_color: '#1e201f',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
