import { createIndexedDbDocumentStorage, type DocumentStorage } from './storage'

export type AppPreferencesStoreDeps = {
  storage?: DocumentStorage
}

const HAS_VISITED_META_KEY = 'hasVisited'

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
}
