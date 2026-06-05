interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type InstallPromptReadyListener = (event: BeforeInstallPromptEvent) => void

declare global {
  interface Window {
    __calculusDeferredInstallPrompt?: BeforeInstallPromptEvent | null
  }
}

let deferredPrompt: BeforeInstallPromptEvent | null =
  window.__calculusDeferredInstallPrompt ?? null
const readyListeners = new Set<InstallPromptReadyListener>()

function storeDeferredPrompt(event: BeforeInstallPromptEvent) {
  event.preventDefault()
  deferredPrompt = event
  window.__calculusDeferredInstallPrompt = event
  for (const listener of readyListeners) listener(event)
}

function clearDeferredPrompt() {
  deferredPrompt = null
  window.__calculusDeferredInstallPrompt = null
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

/** Fixed “Install as app” control; shown only when the browser offers install. */
export function mountInstallPromptButton(): () => void {
  if (isStandaloneApp()) return () => {}

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'pwa-install-link'
  button.textContent = 'Install as app'
  button.hidden = deferredPrompt === null
  document.body.appendChild(button)

  const showButton = () => {
    button.hidden = false
  }

  const onReady = (_event: BeforeInstallPromptEvent) => {
    showButton()
  }

  const onAppInstalled = () => {
    button.hidden = true
  }

  const onClick = () => {
    if (!deferredPrompt) return
    void deferredPrompt.prompt().then(() => deferredPrompt!.userChoice).then(() => {
      clearDeferredPrompt()
      button.hidden = true
    })
  }

  readyListeners.add(onReady)
  window.addEventListener('appinstalled', onAppInstalled)
  button.addEventListener('click', onClick)

  if (deferredPrompt !== null) showButton()

  return () => {
    readyListeners.delete(onReady)
    window.removeEventListener('appinstalled', onAppInstalled)
    button.removeEventListener('click', onClick)
    button.remove()
  }
}
