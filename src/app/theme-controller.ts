import type { EditorInstance } from '../editor'
import type { AppPreferencesStore } from '../documents'
import {
  applyTheme,
  oppositeColorScheme,
  resolveInitialTheme,
  type ColorScheme,
} from '../theme'

export type ThemeController = {
  scheme: ColorScheme
  toggle(): void
  bind(options: { editor: EditorInstance }): void
}

export async function createThemeController(
  preferencesStore: AppPreferencesStore,
): Promise<ThemeController> {
  const storedColorScheme = await preferencesStore.getColorScheme()
  let colorScheme: ColorScheme = resolveInitialTheme(storedColorScheme)
  applyTheme(colorScheme, { persistCache: storedColorScheme !== null })

  let editor: EditorInstance | null = null

  return {
    get scheme() {
      return colorScheme
    },

    bind(options) {
      editor = options.editor
    },

    toggle() {
      colorScheme = oppositeColorScheme(colorScheme)
      applyTheme(colorScheme)
      void preferencesStore.setColorScheme(colorScheme)
      editor?.setColorScheme(colorScheme === 'dark')
    },
  }
}
