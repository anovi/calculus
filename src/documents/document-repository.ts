import { createIndexedDbDocumentStorage, type DocumentRecord, type DocumentStorage } from './storage'

export type DocumentSummary = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

export type DocumentRepositoryDeps = {
  storage?: DocumentStorage
  now?: () => number
  createId?: () => string
}

const LAST_OPEN_DOCUMENT_META_KEY = 'lastOpenDocumentId'
const MAX_EVICTION_ATTEMPTS = 3
const MAX_TITLE_LENGTH = 72
type NormalizedDocument = DocumentRecord & { title: string }

export function isQuotaExceededError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false
  return error.name === 'QuotaExceededError' || error.code === 22 || error.code === 1014
}

function randomId(): string {
  return crypto.randomUUID()
}

export class DocumentRepository {
  private readonly storage: DocumentStorage
  private readonly now: () => number
  private readonly createId: () => string

  constructor(deps: DocumentRepositoryDeps = {}) {
    this.storage = deps.storage ?? createIndexedDbDocumentStorage()
    this.now = deps.now ?? Date.now
    this.createId = deps.createId ?? randomId
  }

  async getDocument(id: string): Promise<NormalizedDocument | null> {
    const doc = await this.storage.getDocument(id)
    if (doc === null) return null
    return this.normalizeDocument(doc)
  }

  async ensureDocument(id: string): Promise<NormalizedDocument> {
    const existing = await this.getDocument(id)
    if (existing !== null) return existing
    return this.createDocument({ id })
  }
 
  async createDocument(options: { id?: string; content?: string } = {}): Promise<NormalizedDocument> {
    const now = this.now()
    const content = options.content ?? ''
    const document: NormalizedDocument = {
      id: options.id ?? this.createId(),
      content,
      title: buildDocumentTitle(content),
      createdAt: now,
      updatedAt: now,
    }
    await this.putWithEviction(document)
    return document
  }

  async saveDocument(input: { id: string; content: string }): Promise<NormalizedDocument> {
    const existing = await this.getDocument(input.id)
    const now = this.now()
    const document: NormalizedDocument = {
      id: input.id,
      content: input.content,
      title: buildDocumentTitle(input.content),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    }
    await this.putWithEviction(document)
    return document
  }

  async listDocumentsByUpdatedDesc(): Promise<DocumentSummary[]> {
    const docs = await this.storage.listDocuments()
    return docs
      .map((doc) => this.normalizeDocument(doc))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(({ id, title, createdAt, updatedAt }) => ({ id, title, createdAt, updatedAt }))
  }

  async deleteOldestDocument(): Promise<DocumentSummary | null> {
    const docs = (await this.storage.listDocuments()).map((doc) => this.normalizeDocument(doc))
    if (docs.length === 0) return null
    docs.sort((a, b) => a.updatedAt - b.updatedAt)
    const oldest = docs[0]
    await this.storage.deleteDocument(oldest.id)
    return {
      id: oldest.id,
      title: oldest.title,
      createdAt: oldest.createdAt,
      updatedAt: oldest.updatedAt,
    }
  }

  async getLastOpenDocumentId(): Promise<string | null> {
    return this.storage.getMeta(LAST_OPEN_DOCUMENT_META_KEY)
  }

  async setLastOpenDocumentId(id: string): Promise<void> {
    await this.storage.setMeta(LAST_OPEN_DOCUMENT_META_KEY, id)
  }

  private async putWithEviction(document: DocumentRecord): Promise<void> {
    let attempts = 0
    while (true) {
      try {
        await this.storage.putDocument(document)
        return
      } catch (error) {
        if (!isQuotaExceededError(error) || attempts >= MAX_EVICTION_ATTEMPTS) throw error
        const deleted = await this.deleteOldestDocument()
        if (deleted === null) throw error
        attempts += 1
      }
    }
  }

  private normalizeDocument(document: DocumentRecord): NormalizedDocument {
    const title = document.title?.trim()
    if (title && title.length > 0) return { ...document, title }
    return { ...document, title: buildDocumentTitle(document.content) }
  }
}

export function buildDocumentTitle(content: string): string {
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed.length === 0) continue
    if (trimmed.length <= MAX_TITLE_LENGTH) return trimmed
    return `${trimmed.slice(0, MAX_TITLE_LENGTH - 1).trimEnd()}…`
  }
  return 'Untitled'
}
