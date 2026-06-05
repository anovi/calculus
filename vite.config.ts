import fs from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

import { parseCurrenciesCsv } from './src/units/parse-currencies-csv'
import { DARK_MODE_BG } from './src/theme/colors'

const projectRoot = dirname(fileURLToPath(import.meta.url))
const currenciesCsv = fs.readFileSync(
  join(projectRoot, 'src/units/currencies-list.csv'),
  'utf8',
)
const currencies = parseCurrenciesCsv(currenciesCsv)

/** Relative base so the app works on GitHub Pages project sites (`/repo/`) and locally. */
export default defineConfig({
  define: {
    __CURRENCIES__: JSON.stringify(currencies),
  },
  base: './',
  server: {
    allowedHosts: ["cramp-shrapnel-encircle.ngrok-free.dev"]
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
  css: {
    // https://vite.dev/config/shared-options.html#css-modules
    modules: {
      scopeBehaviour: 'local',
    }
  },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'icons.svg',
        'pwa-64x64.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'maskable-icon-512x512.png',
        'apple-touch-icon-180x180.png',
      ],
      manifest: {
        name: 'Calculus',
        short_name: 'Calculus',
        description: 'A tiny notebook editor for everyday math.',
        theme_color: DARK_MODE_BG,
        background_color: DARK_MODE_BG,
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: './',
        scope: './',
        icons: [
          {
            src: 'pwa-64x64.png',
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,svg,png,webp,woff2}'],
        cleanupOutdatedCaches: true,
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
