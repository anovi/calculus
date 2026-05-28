import { onHashChange, readDocumentIdFromHash, writeDocumentIdToHash } from './doc-routing'
import { DocumentRepository, type DocumentSummary } from './document-repository'
import { AppPreferencesStore } from './app-preferences-store'

type HashChangeSubscribe = typeof onHashChange

export type DocumentSessionDeps = {
  repository: DocumentRepository
  preferencesStore: AppPreferencesStore
  firstDocumentContent?: string
  readHashId?: () => string | null
  writeHashId?: (id: string) => void
  subscribeHashChange?: HashChangeSubscribe
}

export type ActiveDocument = {
  id: string
  content: string
}

export class DocumentSession {
  private readonly repository: DocumentRepository
  private readonly preferencesStore: AppPreferencesStore
  private readonly firstDocumentContent: string
  private readonly readHashId: () => string | null
  private readonly writeHashId: (id: string) => void
  private readonly subscribeHashChange: HashChangeSubscribe

  private activeDocumentId: string | null = null

  constructor(deps: DocumentSessionDeps) {
    this.repository = deps.repository
    this.preferencesStore = deps.preferencesStore
    this.firstDocumentContent = deps.firstDocumentContent ?? ''
    this.readHashId = deps.readHashId ?? readDocumentIdFromHash
    this.writeHashId = deps.writeHashId ?? writeDocumentIdToHash
    this.subscribeHashChange = deps.subscribeHashChange ?? onHashChange
  }

  async initialize(): Promise<ActiveDocument> {
    const hasVisited = await this.preferencesStore.getHasVisited()

    const hashId = this.readHashId()
    if (hashId !== null) return this.openOrCreateById(hashId, hasVisited)

    const lastOpenId = await this.repository.getLastOpenDocumentId()
    if (lastOpenId !== null) return this.openOrCreateById(lastOpenId, hasVisited)

    return this.createAndOpenDocumentForVisit(hasVisited)
  }

  async openDocument(id: string): Promise<ActiveDocument> {
    const existing = await this.repository.getDocument(id)
    if (existing !== null) {
      await this.setActiveDocument(existing.id)
      return { id: existing.id, content: existing.content }
    }
    await this.setActiveDocument(id)
    return { id, content: '' }
  }

  async createAndOpenDocument(content?: string): Promise<ActiveDocument> {
    const hasVisited = await this.preferencesStore.getHasVisited()
    const resolvedContent = content ?? (hasVisited ? '' : this.firstDocumentContent)
    const document = await this.createActiveDocument({ content: resolvedContent })
    if (!hasVisited) await this.preferencesStore.setHasVisited(true)
    await this.setActiveDocument(document.id)
    return { id: document.id, content: document.content }
  }

  getActiveDocumentId(): string | null {
    return this.activeDocumentId
  }

  async saveActiveDocument(content: string): Promise<void> {
    if (this.activeDocumentId === null) return
    if (content.trim().length === 0) {
      await this.repository.deleteDocument(this.activeDocumentId)
      return
    }
    await this.repository.saveDocument({ id: this.activeDocumentId, content })
  }

  async listDocuments(): Promise<DocumentSummary[]> {
    return this.repository.listDocumentsByUpdatedDesc()
  }

  onHashNavigation(listener: (id: string) => void): () => void {
    return this.subscribeHashChange((id) => {
      if (id === null || id === this.activeDocumentId) return
      listener(id)
    })
  }

  private async setActiveDocument(id: string): Promise<void> {
    this.activeDocumentId = id
    this.writeHashId(id)
    await this.repository.setLastOpenDocumentId(id)
  }

  private async createAndOpenDocumentForVisit(hasVisited: boolean): Promise<ActiveDocument> {
    const content = hasVisited ? '' : this.firstDocumentContent
    const created = await this.createActiveDocument({ content })
    if (!hasVisited) await this.preferencesStore.setHasVisited(true)
    await this.setActiveDocument(created.id)
    return { id: created.id, content: created.content }
  }

  private async openOrCreateById(id: string, hasVisited: boolean): Promise<ActiveDocument> {
    const existing = await this.repository.getDocument(id)
    if (existing !== null) {
      if (!hasVisited) await this.preferencesStore.setHasVisited(true)
      await this.setActiveDocument(existing.id)
      return { id: existing.id, content: existing.content }
    }

    const content = hasVisited ? '' : this.firstDocumentContent
    if (content.trim().length === 0) {
      if (!hasVisited) await this.preferencesStore.setHasVisited(true)
      await this.setActiveDocument(id)
      return { id, content }
    }
    const created = await this.createActiveDocument({ id, content })
    if (!hasVisited) await this.preferencesStore.setHasVisited(true)
    await this.setActiveDocument(created.id)
    return { id: created.id, content: created.content }
  }

  private async createActiveDocument(options: { id?: string; content: string }): Promise<ActiveDocument> {
    const created = await this.repository.createDocument(options)
    if (options.content.trim().length === 0) {
      await this.repository.deleteDocument(created.id)
    }
    return { id: created.id, content: created.content }
  }
}
