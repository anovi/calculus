import assert from 'node:assert'
import { AppPreferencesStore } from './app-preferences-store'
import type { DocumentRecord, DocumentStorage } from './storage'

class FakeStorage implements DocumentStorage {
  async getDocument(_id: string): Promise<DocumentRecord | null> {
    return null
  }

  async putDocument(_document: DocumentRecord): Promise<void> {}

  async listDocuments(): Promise<DocumentRecord[]> {
    return []
  }

  async deleteDocument(_id: string): Promise<void> {}

  private readonly meta = new Map<string, string>()
  async getMeta(key: string): Promise<string | null> {
    return this.meta.get(key) ?? null
  }
  async setMeta(key: string, value: string): Promise<void> {
    this.meta.set(key, value)
  }
}

describe('AppPreferencesStore', () => {
  it('stores and reads hasVisited flag', async () => {
    const store = new AppPreferencesStore({ storage: new FakeStorage() })

    assert.strictEqual(await store.getHasVisited(), false)
    await store.setHasVisited(true)
    assert.strictEqual(await store.getHasVisited(), true)
    await store.setHasVisited(false)
    assert.strictEqual(await store.getHasVisited(), false)
  })
})
