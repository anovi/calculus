import { registerSW } from 'virtual:pwa-register'

import { mountApp } from './app'
import { mountInstallPromptButton } from './pwa'
import { initializeRatesStore } from './rates-store'

const root = document.querySelector<HTMLDivElement>('#editor')
if (!root) {
  throw new Error('#editor missing')
}

await mountApp(root)

registerSW({ immediate: true })
mountInstallPromptButton()

void initializeRatesStore()
