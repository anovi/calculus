export type DocumentRecord = {
  id: string
  content: string
  title?: string
  createdAt: number
  updatedAt: number
}

export interface DocumentStorage {
  getDocument(id: string): Promise<DocumentRecord | null>
  putDocument(document: DocumentRecord): Promise<void>
  listDocuments(): Promise<DocumentRecord[]>
  deleteDocument(id: string): Promise<void>
  getMeta(key: string): Promise<string | null>
  setMeta(key: string, value: string): Promise<void>
}

const DB_NAME = 'calculus-documents'
const DB_VERSION = 1
const DOCUMENTS_STORE = 'documents'
const META_STORE = 'meta'

type MetaRecord = { key: string; value: string }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(DOCUMENTS_STORE)) {
        db.createObjectStore(DOCUMENTS_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'key' })
      }
    }
    request.onsuccess = () => resolve(request.result)
  })
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
    request.onsuccess = () => resolve(request.result)
  })
}

export function createIndexedDbDocumentStorage(): DocumentStorage {
  let dbPromise: Promise<IDBDatabase> | null = null

  async function getDb(): Promise<IDBDatabase> {
    if (dbPromise === null) dbPromise = openDb()
    return dbPromise
  }

  async function withStore<T>(
    storeName: string,
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => Promise<T>,
  ): Promise<T> {
    const db = await getDb()
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    const value = await callback(store)
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
    })
    return value
  }

  return {
    async getDocument(id) {
      return withStore(DOCUMENTS_STORE, 'readonly', async (store) => {
        const result = await promisifyRequest(store.get(id))
        return (result as DocumentRecord | undefined) ?? null
      })
    },
    async putDocument(document) {
      await withStore(DOCUMENTS_STORE, 'readwrite', async (store) => {
        await promisifyRequest(store.put(document))
      })
    },
    async listDocuments() {
      return withStore(DOCUMENTS_STORE, 'readonly', async (store) => {
        const result = await promisifyRequest(store.getAll())
        return result as DocumentRecord[]
      })
    },
    async deleteDocument(id) {
      await withStore(DOCUMENTS_STORE, 'readwrite', async (store) => {
        await promisifyRequest(store.delete(id))
      })
    },
    async getMeta(key) {
      return withStore(META_STORE, 'readonly', async (store) => {
        const record = (await promisifyRequest(store.get(key))) as MetaRecord | undefined
        return record?.value ?? null
      })
    },
    async setMeta(key, value) {
      await withStore(META_STORE, 'readwrite', async (store) => {
        await promisifyRequest(store.put({ key, value } satisfies MetaRecord))
      })
    },
  }
}
