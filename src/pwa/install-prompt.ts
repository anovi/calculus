import { isIOSDevice } from "../lib/mobile-device";

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


const INSTALL_STATUS_KEY = 'installation';
type InstallPropValues = 'dismissed' | 'installed';

/* ------------------------------------------------------------------------------- */

/** Listen as early as possible so we do not miss a prompt fired before UI mounts. */
function captureInstallPrompt() {
  if (isStandaloneApp()) return

  window.addEventListener('beforeinstallprompt', (event) => {
    storeDeferredPrompt(event as BeforeInstallPromptEvent)
  })

  window.addEventListener('appinstalled', () => {
    clearDeferredPrompt()
  })
}

captureInstallPrompt()

/* ------------------------------------------------------------------------------- */

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

function setInstallStatus(value: InstallPropValues) {
  localStorage.setItem(INSTALL_STATUS_KEY, value)
}

function getInstallStatus(): InstallPropValues | undefined {
  return localStorage.getItem(INSTALL_STATUS_KEY) as InstallPropValues;
}

/** True when the app is running as an installed PWA (standalone / home screen). */
export function isStandaloneApp(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return true
  return (navigator as Navigator & { standalone?: boolean }).standalone === true
}

export function isInstallPromptAvailable(): boolean {
  return !isStandaloneApp() && (deferredPrompt !== null || isIOSDevice())
}

export function onInstallAvailabilityChange(listener: () => void): () => void {
  availabilityListeners.add(listener)
  listener()
  return () => availabilityListeners.delete(listener)
}

export function triggerInstallPrompt(): void {
  if (!deferredPrompt) return
  void deferredPrompt.prompt().then(() => deferredPrompt!.userChoice).then((result) => {
    setInstallStatus(result.outcome === 'accepted' ? 'installed' : 'dismissed');
    clearDeferredPrompt()
  })
}

/** Fixed “Install as app” control; shown only when the browser offers install. */
export function mountInstallPromptButton(): () => void {
  if (isStandaloneApp() || getInstallStatus() !== null) return () => {}

  const template = document.getElementById('install-pwa-sheet-template') as HTMLTemplateElement;
  const fragment = template.content.cloneNode(true);
  document.body.appendChild(fragment);

  const sheet = document.querySelector('.install-pwa-sheet')!;
  const button = document.querySelector('.pwa-install-link')!;
  const closeButton = document.querySelector('.install-pwa-sheet-close')!;

  sheet.classList.toggle('hidden', !isInstallPromptAvailable());

  const syncButton = () => {
    sheet.classList.toggle('hidden', !isInstallPromptAvailable());
  }

  const onClick = () => {
    if (isIOSDevice()) {
      invokeInstallOverlayInstruction();
    } else {
      triggerInstallPrompt()
    }
  }
  const onCloseClick = () => {
    close();
    setInstallStatus('dismissed');
  }

  availabilityListeners.add(syncButton);
  button.addEventListener('click', onClick);
  closeButton.addEventListener('click', onCloseClick);

  syncButton()

  const close = () => {
    availabilityListeners.delete(syncButton)
    button.removeEventListener('click', onClick)
    sheet.remove()
  }

  return close;
}

export function syncInstallPromptButtonWithBottomToolbar (toolbarIsVisible: boolean) {
  if (isStandaloneApp()) return;
  const sheet = document.querySelector('.install-pwa-sheet');
  if (!sheet) return;
  sheet.classList.toggle('hidden', toolbarIsVisible);
}

/* ------------------------------------------------------------------------------- */

function invokeInstallOverlayInstruction() {
  if (isStandaloneApp()) return;
  const template = document.getElementById('install-pwa-dialog-template') as HTMLTemplateElement;
  if (!template) return;
  const fragment = template.content.cloneNode(true);
  document.body.appendChild(fragment);

  const dialog = document.querySelector('.install-pwa-wrapper')!;
  const close = () => document.body.removeChild(dialog);

  const closeButton = document.getElementById('install-pwa-close');
  closeButton?.addEventListener('click', () => {
    close();
  })
}
