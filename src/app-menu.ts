import { mountPopupMenu } from './components/popup-menu'
import {
  isStandaloneApp,
  isInstallPromptAvailable,
  onInstallAvailabilityChange,
  triggerInstallPrompt,
} from './pwa'

function isInstallMenuItemVisible(): boolean {
  return !isStandaloneApp() && isInstallPromptAvailable()
}

/** Popup menu for app links and install; toggles from `trigger`. */
export function mountAppMenu(trigger: HTMLButtonElement): () => void {
  const popup = mountPopupMenu(trigger, {
    items: () => [
      {
        kind: 'action',
        id: 'install',
        label: 'Install the app',
        hidden: !isInstallMenuItemVisible(),
        onClick: triggerInstallPrompt,
      },
      {
        kind: 'link',
        label: 'User Manual',
        href: 'https://github.com/anovi/calculus/blob/main/docs/user-manual.md',
      },
      {
        kind: 'link',
        label: 'Found a bug or have request?',
        href: 'https://github.com/anovi/calculus/issues',
      },
      { kind: 'separator' },
      {
        kind: 'link',
        label: 'Author: Aleksei Novichkov',
        href: 'http://novichkov.link',
      },
      {
        kind: 'link',
        label: 'GitHub',
        href: 'https://github.com/anovi/calculus',
      },
    ],
  })

  const stopAvailabilityListener = onInstallAvailabilityChange(() => {
    if (popup.isOpen()) popup.render()
  })

  return () => {
    stopAvailabilityListener()
    popup.destroy()
  }
}
