import type { EditorInstance } from '../editor'
import type { AppPreferencesStore } from '../documents'
import {
  applyTheme,
  oppositeColorScheme,
  resolveInitialTheme,
  syncThemeToggleButton,
  type ColorScheme,
} from '../theme'

export type ThemeController = {
  scheme: ColorScheme
  toggle(): void
  bind(options: { editor: EditorInstance; themeButton: HTMLButtonElement }): void
}

export async function createThemeController(
  preferencesStore: AppPreferencesStore,
): Promise<ThemeController> {
  const storedColorScheme = await preferencesStore.getColorScheme()
  let colorScheme: ColorScheme = resolveInitialTheme(storedColorScheme)
  applyTheme(colorScheme, { persistCache: storedColorScheme !== null })

  let editor: EditorInstance | null = null
  let themeButton: HTMLButtonElement | null = null

  return {
    get scheme() {
      return colorScheme
    },

    bind(options) {
      editor = options.editor
      themeButton = options.themeButton
    },

    toggle() {
      colorScheme = oppositeColorScheme(colorScheme)
      applyTheme(colorScheme)
      void preferencesStore.setColorScheme(colorScheme)
      if (themeButton) syncThemeToggleButton(themeButton, colorScheme)
      editor?.setColorScheme(colorScheme === 'dark')
    },
  }
}
