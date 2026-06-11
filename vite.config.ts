import fs from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

import { versionedIconAsset } from './icon-assets-version'
import { parseCurrenciesCsv } from './src/units/parse-currencies-csv'
import { DARK_MODE_BG } from './src/theme/colors'

const faviconIco = versionedIconAsset('favicon.ico')
const faviconSvg = versionedIconAsset('favicon.svg')
const appleTouchIcon = versionedIconAsset('apple-touch-icon-180x180.png')
const pwa64 = versionedIconAsset('pwa-64x64.png')
const pwa192 = versionedIconAsset('pwa-192x192.png')
const pwa512 = versionedIconAsset('pwa-512x512.png')
const maskableIcon = versionedIconAsset('maskable-icon-512x512.png')

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
    {
      name: 'versioned-icon-assets',
      transformIndexHtml(html) {
        return html
          .replaceAll('/favicon.ico', `/${faviconIco}`)
          .replaceAll('/favicon.svg', `/${faviconSvg}`)
          .replaceAll(
            '/apple-touch-icon-180x180.png',
            `/${appleTouchIcon}`,
          )
      },
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        faviconIco,
        faviconSvg,
        pwa64,
        pwa192,
        pwa512,
        maskableIcon,
        appleTouchIcon,
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
            src: pwa64,
            sizes: '64x64',
            type: 'image/png',
          },
          {
            src: pwa192,
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: pwa512,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: maskableIcon,
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
