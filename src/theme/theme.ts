import { setIconButtonIcon } from '../components/icon-button'
import type { IconName } from '../components/icons'

import {
  DARK_MODE_BG,
  LIGHT_MODE_BG,
  THEME_STORAGE_KEY,
  type ColorScheme,
} from './colors'

export { DARK_MODE_BG, LIGHT_MODE_BG, THEME_STORAGE_KEY, type ColorScheme } from './colors'

export function systemColorScheme(): ColorScheme {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function resolveInitialTheme(stored: ColorScheme | null): ColorScheme {
  return stored ?? systemColorScheme()
}

export function themeBgColor(theme: ColorScheme): string {
  return theme === 'light' ? LIGHT_MODE_BG : DARK_MODE_BG
}

export function oppositeColorScheme(theme: ColorScheme): ColorScheme {
  return theme === 'light' ? 'dark' : 'light'
}

export function applyTheme(theme: ColorScheme, options: { persistCache?: boolean } = {}): void {
  const { persistCache = true } = options
  document.documentElement.dataset.theme = theme

  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (meta) meta.content = themeBgColor(theme)

  if (persistCache) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Ignore quota / private mode errors.
    }
  }
}

export function themeToggleIcon(theme: ColorScheme): IconName {
  return theme === 'dark' ? 'sun' : 'moon'
}

export function themeToggleLabel(theme: ColorScheme): string {
  return theme === 'dark' ? 'Light mode' : 'Dark mode'
}

export function syncThemeToggleButton(button: HTMLButtonElement, theme: ColorScheme): void {
  setIconButtonIcon(button, themeToggleIcon(theme))
  button.setAttribute('aria-label', themeToggleLabel(theme))
}
