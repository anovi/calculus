import fs from 'node:fs'

import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import { VitePWA } from 'vite-plugin-pwa'

import { buildCurrencyUnitAlternationBody } from './src/language/inline-units/currency-unit-alternation'

const UNIT_MARKER = 'Unit { "@@INJECT@@" }'

function injectInlineUnitsCurrencyGrammar(): Plugin {
  return {
    name: 'inject-inline-units-currency-grammar',
    enforce: 'pre',
    load(id) {
      const normalized = id.replace(/\\/g, '/')
      if (!normalized.includes('inline-units/calculus-language.grammar')) return null
      if (!/\?raw(?:&|$)/.test(normalized) && !normalized.endsWith('?raw')) return null
      const pathOnly = id.split('?')[0]
      let source = fs.readFileSync(pathOnly, 'utf8')
      if (!source.includes('@@INJECT@@')) return null
      source = source.replace(UNIT_MARKER, `Unit { ${buildCurrencyUnitAlternationBody()} }`)
      return `export default ${JSON.stringify(source)}`
    },
  }
}

/** Relative base so the app works on GitHub Pages project sites (`/repo/`) and locally. */
export default defineConfig({
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
    injectInlineUnitsCurrencyGrammar(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'Calculus',
        short_name: 'Calculus',
        description: 'A tiny notebook editor for everyday math.',
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
