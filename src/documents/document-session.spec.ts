import assert from 'node:assert'
import { DocumentSession } from './document-session'
import type { DocumentSummary } from './document-repository'
import type { DocumentRecord } from './storage'

class FakePreferencesStore {
  public hasVisited = false

  async getHasVisited(): Promise<boolean> {
    return this.hasVisited
  }

  async setHasVisited(hasVisited: boolean): Promise<void> {
    this.hasVisited = hasVisited
  }
}

class FakeRepository {
  public readonly docs = new Map<string, DocumentRecord>()
  public lastOpenId: string | null = null
  public nextId = 1

  async getDocument(id: string): Promise<DocumentRecord | null> {
    return this.docs.get(id) ?? null
  }

  async ensureDocument(id: string): Promise<DocumentRecord> {
    const existing = this.docs.get(id)
    if (existing) return existing
    return this.createDocument({ id })
  }

  async createDocument(options: { id?: string; content?: string } = {}): Promise<DocumentRecord> {
    const id = options.id ?? `doc-${this.nextId++}`
    const now = Date.now()
    const record: DocumentRecord = {
      id,
      content: options.content ?? '',
      title: options.content?.trim() || 'Untitled',
      createdAt: now,
      updatedAt: now,
    }
    this.docs.set(id, record)
    return record
  }

  async saveDocument(input: { id: string; content: string }): Promise<DocumentRecord> {
    const existing = this.docs.get(input.id)
    const now = Date.now()
    const record: DocumentRecord = {
      id: input.id,
      content: input.content,
      title: input.content.trim() || 'Untitled',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    this.docs.set(input.id, record)
    return record
  }

  async deleteDocument(id: string): Promise<void> {
    this.docs.delete(id)
  }

  async listDocumentsByUpdatedDesc(): Promise<DocumentSummary[]> {
    return [...this.docs.values()]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(({ id, title, createdAt, updatedAt }) => ({
        id,
        title: title ?? 'Untitled',
        createdAt,
        updatedAt,
      }))
  }

  async getLastOpenDocumentId(): Promise<string | null> {
    return this.lastOpenId
  }

  async setLastOpenDocumentId(id: string): Promise<void> {
    this.lastOpenId = id
  }
}

describe('DocumentSession', () => {
  it('wires hash navigation subscription by default', async () => {
    const repository = new FakeRepository()
    const preferencesStore = new FakePreferencesStore()
    const restoreWindow = globalThis.window
    const captured: Record<string, EventListener> = {}
    const removed: Record<string, EventListener> = {}

    const location = { hash: '#doc=initial' }
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        addEventListener: (event: string, listener: EventListener) => {
          captured[event] = listener
        },
        removeEventListener: (event: string, listener: EventListener) => {
          removed[event] = listener
        },
        location,
      },
    })

    try {
      const session = new DocumentSession({
        repository: repository as unknown as import('./document-repository').DocumentRepository,
        preferencesStore: preferencesStore as unknown as import('./app-preferences-store').AppPreferencesStore,
      })
      await session.initialize()

      let navigatedTo: string | null = null
      const unsubscribe = session.onHashNavigation((id) => {
        navigatedTo = id
      })

      location.hash = '#doc=target'
      captured.hashchange?.(new Event('hashchange'))
      assert.strictEqual(navigatedTo, 'target')
      unsubscribe()
      assert.strictEqual(removed.hashchange, captured.hashchange)
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: restoreWindow,
      })
    }
  })

  it('prefers hash document on initialization', async () => {
    const repository = new FakeRepository()
    const preferencesStore = new FakePreferencesStore()
    await repository.createDocument({ id: 'from-hash', content: 'A' })
    repository.lastOpenId = 'from-last'
    const writtenHashes: string[] = []

    const session = new DocumentSession({
      repository: repository as unknown as import('./document-repository').DocumentRepository,
      preferencesStore: preferencesStore as unknown as import('./app-preferences-store').AppPreferencesStore,
      firstDocumentContent: 'WELCOME',
      readHashId: () => 'from-hash',
      writeHashId: (id) => writtenHashes.push(id),
    })

    const doc = await session.initialize()
    assert.strictEqual(doc.id, 'from-hash')
    assert.strictEqual(doc.content, 'A')
    assert.strictEqual(preferencesStore.hasVisited, true)
    assert.strictEqual(session.getActiveDocumentId(), 'from-hash')
    assert.deepStrictEqual(writtenHashes, ['from-hash'])
  })

  it('falls back to last open id when no hash exists', async () => {
    const repository = new FakeRepository()
    const preferencesStore = new FakePreferencesStore()
    await repository.createDocument({ id: 'last-open', content: 'A' })
    repository.lastOpenId = 'last-open'
    const session = new DocumentSession({
      repository: repository as unknown as import('./document-repository').DocumentRepository,
      preferencesStore: preferencesStore as unknown as import('./app-preferences-store').AppPreferencesStore,
      firstDocumentContent: 'WELCOME',
      readHashId: () => null,
      writeHashId: () => {},
    })

    const doc = await session.initialize()
    assert.strictEqual(doc.id, 'last-open')
    assert.strictEqual(doc.content, 'A')
    assert.strictEqual(preferencesStore.hasVisited, true)
  })

  it('creates first document from welcome content when user has not visited', async () => {
    const repository = new FakeRepository()
    const preferencesStore = new FakePreferencesStore()
    const session = new DocumentSession({
      repository: repository as unknown as import('./document-repository').DocumentRepository,
      preferencesStore: preferencesStore as unknown as import('./app-preferences-store').AppPreferencesStore,
      firstDocumentContent: 'WELCOME',
      readHashId: () => null,
      writeHashId: () => {},
    })

    const doc = await session.initialize()
    assert.ok(doc.id.startsWith('doc-'))
    assert.strictEqual(doc.content, 'WELCOME')
    assert.strictEqual(preferencesStore.hasVisited, true)
    assert.strictEqual(session.getActiveDocumentId(), doc.id)
  })

  it('creates empty first document when user already visited', async () => {
    const repository = new FakeRepository()
    const preferencesStore = new FakePreferencesStore()
    preferencesStore.hasVisited = true
    const session = new DocumentSession({
      repository: repository as unknown as import('./document-repository').DocumentRepository,
      preferencesStore: preferencesStore as unknown as import('./app-preferences-store').AppPreferencesStore,
      firstDocumentContent: 'WELCOME',
      readHashId: () => null,
      writeHashId: () => {},
    })

    const doc = await session.initialize()
    assert.strictEqual(doc.content, '')
  })

  it('saves content to the active document', async () => {
    const repository = new FakeRepository()
    const preferencesStore = new FakePreferencesStore()
    const session = new DocumentSession({
      repository: repository as unknown as import('./document-repository').DocumentRepository,
      preferencesStore: preferencesStore as unknown as import('./app-preferences-store').AppPreferencesStore,
      firstDocumentContent: 'WELCOME',
      readHashId: () => null,
      writeHashId: () => {},
    })
    const doc = await session.initialize()
    await session.saveActiveDocument('updated')

    assert.strictEqual((await repository.getDocument(doc.id))?.content, 'updated')
  })

  it('opens unknown hash target by creating a document', async () => {
    const repository = new FakeRepository()
    const preferencesStore = new FakePreferencesStore()
    const session = new DocumentSession({
      repository: repository as unknown as import('./document-repository').DocumentRepository,
      preferencesStore: preferencesStore as unknown as import('./app-preferences-store').AppPreferencesStore,
      firstDocumentContent: 'WELCOME',
      readHashId: () => null,
      writeHashId: () => {},
    })
    await session.initialize()

    const opened = await session.openDocument('from-link')
    assert.strictEqual(opened.id, 'from-link')
    assert.strictEqual(await repository.getDocument('from-link'), null)
  })

  it('creates first explicit new document with welcome content, then empty ones', async () => {
    const repository = new FakeRepository()
    const preferencesStore = new FakePreferencesStore()
    const session = new DocumentSession({
      repository: repository as unknown as import('./document-repository').DocumentRepository,
      preferencesStore: preferencesStore as unknown as import('./app-preferences-store').AppPreferencesStore,
      firstDocumentContent: 'WELCOME',
      readHashId: () => null,
      writeHashId: () => {},
    })

    const first = await session.createAndOpenDocument()
    assert.strictEqual(first.content, 'WELCOME')
    assert.strictEqual(preferencesStore.hasVisited, true)

    const second = await session.createAndOpenDocument()
    assert.strictEqual(second.content, '')
    assert.strictEqual(await repository.getDocument(second.id), null)
  })

  it('does not persist whitespace-only content for active document', async () => {
    const repository = new FakeRepository()
    const preferencesStore = new FakePreferencesStore()
    preferencesStore.hasVisited = true
    const session = new DocumentSession({
      repository: repository as unknown as import('./document-repository').DocumentRepository,
      preferencesStore: preferencesStore as unknown as import('./app-preferences-store').AppPreferencesStore,
      firstDocumentContent: 'WELCOME',
      readHashId: () => null,
      writeHashId: () => {},
    })

    const doc = await session.createAndOpenDocument()
    assert.strictEqual(await repository.getDocument(doc.id), null)

    await session.saveActiveDocument('   \n\t  ')
    assert.strictEqual(await repository.getDocument(doc.id), null)
  })

  it('deletes persisted document when active content is cleared and re-persists on non-empty save', async () => {
    const repository = new FakeRepository()
    const preferencesStore = new FakePreferencesStore()
    preferencesStore.hasVisited = true
    const session = new DocumentSession({
      repository: repository as unknown as import('./document-repository').DocumentRepository,
      preferencesStore: preferencesStore as unknown as import('./app-preferences-store').AppPreferencesStore,
      firstDocumentContent: 'WELCOME',
      readHashId: () => null,
      writeHashId: () => {},
    })

    const doc = await session.createAndOpenDocument()
    await session.saveActiveDocument('hello')
    assert.strictEqual((await repository.getDocument(doc.id))?.content, 'hello')

    await session.saveActiveDocument('  ')
    assert.strictEqual(await repository.getDocument(doc.id), null)

    await session.saveActiveDocument('back again')
    assert.strictEqual((await repository.getDocument(doc.id))?.content, 'back again')
  })
})
