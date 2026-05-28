import { showPanel, type Panel, type EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

export type DocumentControlsPanelDeps = {
  onToggleDocuments: () => void
  onCreateDocument: () => void
}

export type DocumentControlsPanel = {
  extension: Extension
  toggleButton: HTMLButtonElement
}

export function createDocumentControlsPanel(deps: DocumentControlsPanelDeps): DocumentControlsPanel {
  const toggleButton = document.createElement('button')
  toggleButton.type = 'button'
  toggleButton.id = 'documents-toggle'
  toggleButton.className = 'cm-document-controls__button'
  toggleButton.setAttribute('aria-label', 'Open documents')
  toggleButton.setAttribute('aria-expanded', 'false')
  toggleButton.textContent = 'Docs'
  toggleButton.addEventListener('click', () => deps.onToggleDocuments())

  const createButton = document.createElement('button')
  createButton.type = 'button'
  createButton.id = 'documents-create'
  createButton.className = 'cm-document-controls__button'
  createButton.setAttribute('aria-label', 'Create new document')
  createButton.textContent = '+'
  createButton.addEventListener('click', () => deps.onCreateDocument())

  const extension = showPanel.of((_view: EditorView): Panel => {
    const dom = document.createElement('div')
    dom.className = 'cm-document-controls-panel'
    dom.append(toggleButton, createButton)
    return { dom, top: true }
  })

  return { extension, toggleButton }
}
