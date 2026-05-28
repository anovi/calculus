const HASH_PREFIX = '#doc='

export function readDocumentIdFromHash(hash: string = window.location.hash): string | null {
  if (!hash.startsWith(HASH_PREFIX)) return null
  const encoded = hash.slice(HASH_PREFIX.length).trim()
  if (encoded.length === 0) return null
  try {
    const decoded = decodeURIComponent(encoded)
    return decoded.length > 0 ? decoded : null
  } catch {
    return null
  }
}

export function writeDocumentIdToHash(id: string): void {
  const nextHash = `${HASH_PREFIX}${encodeURIComponent(id)}`
  if (window.location.hash === nextHash) return
  window.location.hash = nextHash
}

export function onHashChange(listener: (id: string | null) => void): () => void {
  const callback = () => listener(readDocumentIdFromHash())
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}
