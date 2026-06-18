import type { AppContext } from '../app'
import { mountPopupMenu } from '../components/popup-menu'
import {
  isStandaloneApp,
  isInstallPromptAvailable,
  onInstallAvailabilityChange,
  triggerInstallPrompt,
} from '../pwa'
import { themeToggleIcon, themeToggleLabel } from '../theme'

function isInstallMenuItemVisible(): boolean {
  return !isStandaloneApp() && isInstallPromptAvailable()
}

/** Popup menu for app links and install; toggles from `trigger`. */
export function mountAppMenu(trigger: HTMLButtonElement, ctx: AppContext): () => void {
  const popup = mountPopupMenu(trigger, {
    items: () => [
      {
        kind: 'action',
        id: 'theme',
        label: themeToggleLabel(ctx.theme.scheme),
        icon: themeToggleIcon(ctx.theme.scheme),
        onClick: () => ctx.theme.toggle(),
      },
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
        href: 'https://github.com/anovi/compio/blob/main/docs/user-manual.md',
      },
      {
        kind: 'link',
        label: 'Found a bug or have request?',
        href: 'https://github.com/anovi/compio/issues',
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
        href: 'https://github.com/anovi/compio',
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
