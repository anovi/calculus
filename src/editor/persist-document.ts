import { EditorView } from 'codemirror'
import type { Extension } from '@codemirror/state'

import type { AppContext } from '../app'

export function createPersistDocumentExtension(
  ctx: Pick<AppContext, 'session'>,
): Extension {
  let persistTimer: ReturnType<typeof setTimeout> | null = null

  return EditorView.updateListener.of((update) => {
    if (!update.docChanged) return
    if (persistTimer !== null) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      persistTimer = null
      void ctx.session.saveActiveDocument(update.state.doc.toString())
        .catch((error) => {
          console.warn('Failed to persist document:', error)
        })
    }, 120)
  })
}
