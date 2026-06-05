interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

/** True when the app is running as an installed PWA (standalone / home screen). */
export function isStandaloneApp(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return true
  return (navigator as Navigator & { standalone?: boolean }).standalone === true
}

/** Fixed “Install as app” control; shown only when the browser offers install. */
export function mountInstallPromptButton(): () => void {
  if (isStandaloneApp()) return () => {}

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'pwa-install-link'
  button.textContent = 'Install as app'
  button.hidden = true
  document.body.appendChild(button)

  let deferredPrompt: BeforeInstallPromptEvent | null = null

  const onBeforeInstallPrompt = (event: Event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    button.hidden = false
  }

  const onAppInstalled = () => {
    deferredPrompt = null
    button.hidden = true
  }

  const onClick = () => {
    if (!deferredPrompt) return
    void deferredPrompt.prompt().then(() => deferredPrompt!.userChoice).then(() => {
      deferredPrompt = null
      button.hidden = true
    })
  }

  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
  window.addEventListener('appinstalled', onAppInstalled)
  button.addEventListener('click', onClick)

  return () => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.removeEventListener('appinstalled', onAppInstalled)
    button.removeEventListener('click', onClick)
    button.remove()
  }
}
