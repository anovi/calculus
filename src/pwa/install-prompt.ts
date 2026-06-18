interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type InstallPromptReadyListener = (event: BeforeInstallPromptEvent) => void
type InstallAvailabilityListener = () => void

declare global {
  interface Window {
    __compioDeferredInstallPrompt?: BeforeInstallPromptEvent | null
  }
}

let deferredPrompt: BeforeInstallPromptEvent | null =
  window.__compioDeferredInstallPrompt ?? null
const readyListeners = new Set<InstallPromptReadyListener>()
const availabilityListeners = new Set<InstallAvailabilityListener>()

function notifyAvailabilityChange() {
  for (const listener of availabilityListeners) listener()
}

function storeDeferredPrompt(event: BeforeInstallPromptEvent) {
  event.preventDefault()
  deferredPrompt = event
  window.__compioDeferredInstallPrompt = event
  for (const listener of readyListeners) listener(event)
  notifyAvailabilityChange()
}

function clearDeferredPrompt() {
  deferredPrompt = null
  window.__compioDeferredInstallPrompt = null
  notifyAvailabilityChange()
}

function captureInstallPrompt() {
  if (isStandaloneApp()) return

  window.addEventListener('beforeinstallprompt', (event) => {
    storeDeferredPrompt(event as BeforeInstallPromptEvent)
  })

  window.addEventListener('appinstalled', () => {
    clearDeferredPrompt()
  })
}

/** True when the app is running as an installed PWA (standalone / home screen). */
export function isStandaloneApp(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return true
  return (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** Listen as early as possible so we do not miss a prompt fired before UI mounts. */
captureInstallPrompt()

export function isInstallPromptAvailable(): boolean {
  return !isStandaloneApp() && deferredPrompt !== null
}

export function onInstallAvailabilityChange(listener: () => void): () => void {
  availabilityListeners.add(listener)
  listener()
  return () => availabilityListeners.delete(listener)
}

export function triggerInstallPrompt(): void {
  if (!deferredPrompt) return
  void deferredPrompt.prompt().then(() => deferredPrompt!.userChoice).then(() => {
    clearDeferredPrompt()
  })
}

/** Fixed “Install as app” control; shown only when the browser offers install. */
export function mountInstallPromptButton(): () => void {
  if (isStandaloneApp()) return () => {}

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'pwa-install-link'
  button.textContent = 'Install as app'
  button.hidden = !isInstallPromptAvailable()
  document.body.appendChild(button)

  const syncButton = () => {
    button.hidden = !isInstallPromptAvailable()
  }

  const onClick = () => {
    triggerInstallPrompt()
  }

  const stopAvailability = onInstallAvailabilityChange(syncButton)
  button.addEventListener('click', onClick)

  return () => {
    stopAvailability()
    button.removeEventListener('click', onClick)
    button.remove()
  }
}
