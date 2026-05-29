import fs from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

import { parseCurrenciesCsv } from './src/units/parse-currencies-csv'

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
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Calculus',
        short_name: 'Calculus',
        description: 'A tiny notebook editor for everyday math.',
        theme_color: '#141c2e',
        background_color: '#141c2e',
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
