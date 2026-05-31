import { createIndexedDbDocumentStorage, type DocumentStorage } from './storage'
import type { ColorScheme } from '../theme'

export type AppPreferencesStoreDeps = {
  storage?: DocumentStorage
}

const HAS_VISITED_META_KEY = 'hasVisited'
const COLOR_SCHEME_META_KEY = 'colorScheme'

function isColorScheme(value: string | null): value is ColorScheme {
  return value === 'light' || value === 'dark'
}

export class AppPreferencesStore {
  private readonly storage: DocumentStorage

  constructor(deps: AppPreferencesStoreDeps = {}) {
    this.storage = deps.storage ?? createIndexedDbDocumentStorage()
  }

  async getHasVisited(): Promise<boolean> {
    return (await this.storage.getMeta(HAS_VISITED_META_KEY)) === '1'
  }

  async setHasVisited(hasVisited: boolean): Promise<void> {
    await this.storage.setMeta(HAS_VISITED_META_KEY, hasVisited ? '1' : '0')
  }

  async getColorScheme(): Promise<ColorScheme | null> {
    const value = await this.storage.getMeta(COLOR_SCHEME_META_KEY)
    return isColorScheme(value) ? value : null
  }

  async setColorScheme(scheme: ColorScheme): Promise<void> {
    await this.storage.setMeta(COLOR_SCHEME_META_KEY, scheme)
  }
}
