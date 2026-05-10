import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

/** Relative base so the app works on GitHub Pages project sites (`/repo/`) and locally. */
export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'EUR exchange rates',
        short_name: 'EUR rates',
        description: 'EUR to major world currencies from Frankfurter, with offline support.',
        theme_color: '#0c1222',
        background_color: '#0c1222',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,png,webp,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) =>
              url.origin === 'https://api.frankfurter.dev' &&
              url.pathname.startsWith('/v2/rates'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'frankfurter-rates-v2',
              expiration: {
                maxEntries: 40,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
})
