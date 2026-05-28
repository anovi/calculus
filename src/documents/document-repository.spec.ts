import assert from 'node:assert'
import { buildDocumentTitle, DocumentRepository, isQuotaExceededError } from './document-repository'
import type { DocumentRecord, DocumentStorage } from './storage'

class FakeStorage implements DocumentStorage {
  public readonly docs = new Map<string, DocumentRecord>()
  public readonly meta = new Map<string, string>()
  public failPutsLeft = 0
  public failWith: unknown = new DOMException('full', 'QuotaExceededError')

  async getDocument(id: string): Promise<DocumentRecord | null> {
    return this.docs.get(id) ?? null
  }

  async putDocument(document: DocumentRecord): Promise<void> {
    if (this.failPutsLeft > 0) {
      this.failPutsLeft -= 1
      throw this.failWith
    }
    this.docs.set(document.id, { ...document })
  }

  async listDocuments(): Promise<DocumentRecord[]> {
    return [...this.docs.values()].map((doc) => ({ ...doc }))
  }

  async deleteDocument(id: string): Promise<void> {
    this.docs.delete(id)
  }

  async getMeta(key: string): Promise<string | null> {
    return this.meta.get(key) ?? null
  }

  async setMeta(key: string, value: string): Promise<void> {
    this.meta.set(key, value)
  }
}

describe('DocumentRepository', () => {
  it('creates and fetches documents', async () => {
    const storage = new FakeStorage()
    const repo = new DocumentRepository({
      storage,
      now: () => 1000,
      createId: () => 'doc-1',
    })

    const created = await repo.createDocument({ content: 'hello' })
    assert.strictEqual(created.id, 'doc-1')
    assert.strictEqual(created.content, 'hello')
    assert.strictEqual(created.title, 'hello')
    assert.strictEqual(created.createdAt, 1000)
    assert.strictEqual(created.updatedAt, 1000)

    const loaded = await repo.getDocument('doc-1')
    assert.strictEqual(loaded?.content, 'hello')
  })

  it('ensures existing document, otherwise creates one with requested id', async () => {
    const storage = new FakeStorage()
    const repo = new DocumentRepository({ storage, now: () => 1000 })

    const first = await repo.ensureDocument('doc-a')
    assert.strictEqual(first.id, 'doc-a')
    assert.strictEqual(first.content, '')
    assert.strictEqual(first.title, 'Untitled')

    await repo.saveDocument({ id: 'doc-a', content: 'updated' })
    const again = await repo.ensureDocument('doc-a')
    assert.strictEqual(again.content, 'updated')
    assert.strictEqual(again.title, 'updated')
  })

  it('lists documents by updatedAt descending', async () => {
    const storage = new FakeStorage()
    storage.docs.set('old', { id: 'old', title: 'Old', content: '', createdAt: 10, updatedAt: 10 })
    storage.docs.set('new', { id: 'new', title: 'New', content: '', createdAt: 20, updatedAt: 30 })
    storage.docs.set('mid', { id: 'mid', title: 'Mid', content: '', createdAt: 15, updatedAt: 20 })

    const repo = new DocumentRepository({ storage })
    const list = await repo.listDocumentsByUpdatedDesc()
    assert.deepStrictEqual(list.map((item) => item.id), ['new', 'mid', 'old'])
    assert.deepStrictEqual(list.map((item) => item.title), ['New', 'Mid', 'Old'])
  })

  it('stores and reads last open document id', async () => {
    const storage = new FakeStorage()
    const repo = new DocumentRepository({ storage })

    assert.strictEqual(await repo.getLastOpenDocumentId(), null)
    await repo.setLastOpenDocumentId('doc-z')
    assert.strictEqual(await repo.getLastOpenDocumentId(), 'doc-z')
  })

  it('deletes a document by id', async () => {
    const storage = new FakeStorage()
    storage.docs.set('doc-1', { id: 'doc-1', title: 'Doc', content: 'x', createdAt: 1, updatedAt: 2 })
    const repo = new DocumentRepository({ storage })

    await repo.deleteDocument('doc-1')
    assert.strictEqual(await repo.getDocument('doc-1'), null)
  })

  it('deletes the oldest document when quota is exceeded and retries', async () => {
    const storage = new FakeStorage()
    storage.docs.set('oldest', { id: 'oldest', title: 'a', content: 'a', createdAt: 1, updatedAt: 1 })
    storage.docs.set('newer', { id: 'newer', title: 'b', content: 'b', createdAt: 2, updatedAt: 2 })
    storage.failPutsLeft = 1
    const repo = new DocumentRepository({ storage, now: () => 50 })

    const saved = await repo.saveDocument({ id: 'current', content: 'new content' })
    assert.strictEqual(saved.id, 'current')
    assert.strictEqual(saved.title, 'new content')
    assert.strictEqual(storage.docs.has('oldest'), false)
    assert.strictEqual(storage.docs.get('current')?.content, 'new content')
  })

  it('derives title from first non-empty line and limits length', () => {
    assert.strictEqual(buildDocumentTitle('\n   \n  hello world  \nnext'), 'hello world')
    const longLine = 'x'.repeat(100)
    const title = buildDocumentTitle(longLine)
    assert.strictEqual(title.length, 72)
    assert.ok(title.endsWith('…'))
    assert.strictEqual(buildDocumentTitle('   \n\t'), 'Untitled')
  })

  it('normalizes missing legacy titles from content', async () => {
    const storage = new FakeStorage()
    storage.docs.set('legacy', {
      id: 'legacy',
      content: '\n  My title \nvalue = 1',
      createdAt: 1,
      updatedAt: 2,
    })
    const repo = new DocumentRepository({ storage })

    const loaded = await repo.getDocument('legacy')
    assert.strictEqual(loaded?.title, 'My title')
    const list = await repo.listDocumentsByUpdatedDesc()
    assert.strictEqual(list[0]?.title, 'My title')
  })

  it('rethrows non-quota errors', async () => {
    const storage = new FakeStorage()
    storage.failPutsLeft = 1
    storage.failWith = new Error('boom')
    const repo = new DocumentRepository({ storage })

    await assert.rejects(() => repo.createDocument({ id: 'a', content: 'x' }), /boom/)
  })

  it('detects quota errors by name', () => {
    assert.strictEqual(isQuotaExceededError(new DOMException('full', 'QuotaExceededError')), true)
    assert.strictEqual(isQuotaExceededError(new Error('full')), false)
  })
})
