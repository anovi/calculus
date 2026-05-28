import { undo, redo } from '@codemirror/commands'
import { showPanel, type Panel, type EditorView } from '@codemirror/view'
import type { Extension } from '@codemirror/state'

import { setButtonIcon } from './button-icons'

export type DocumentControlsPanelDeps = {
  onToggleDocuments: () => void
  onCreateDocument: () => void
}

export type DocumentControlsPanel = {
  extension: Extension
  toggleButton: HTMLButtonElement
}

function createHistoryButton(
  view: EditorView,
  kind: 'undo' | 'redo',
): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'cm-document-controls__button cm-document-controls__history-button'
  btn.setAttribute('aria-label', kind === 'undo' ? 'Undo' : 'Redo')
  setButtonIcon(btn, kind)
  btn.addEventListener('click', () => {
    const run = kind === 'undo' ? undo : redo
    run({
      state: view.state,
      dispatch(transaction) {
        view.dispatch(transaction)
      },
    })
    btn.blur()
  })
  return btn
}

export function createDocumentControlsPanel(deps: DocumentControlsPanelDeps): DocumentControlsPanel {
  const toggleButton = document.createElement('button')
  toggleButton.type = 'button'
  toggleButton.id = 'documents-toggle'
  toggleButton.className = 'cm-document-controls__button cm-document-controls__menu-button'
  toggleButton.setAttribute('aria-label', 'Open documents')
  toggleButton.setAttribute('aria-expanded', 'false')
  setButtonIcon(toggleButton, 'menu')
  toggleButton.addEventListener('click', () => deps.onToggleDocuments())

  const createButton = document.createElement('button')
  createButton.type = 'button'
  createButton.id = 'documents-create'
  createButton.className = 'cm-document-controls__button'
  createButton.setAttribute('aria-label', 'Create new document')
  setButtonIcon(createButton, 'plus')
  createButton.addEventListener('click', () => deps.onCreateDocument())

  const extension = showPanel.of((view: EditorView): Panel => {
    const dom = document.createElement('div')
    dom.className = 'cm-document-controls-panel'

    const start = document.createElement('div')
    start.className = 'cm-document-controls-panel__start'
    start.append(toggleButton, createButton)

    const end = document.createElement('div')
    end.className = 'cm-document-controls-panel__end'
    end.append(
      createHistoryButton(view, 'undo'),
      createHistoryButton(view, 'redo'),
    )

    dom.append(start, end)
    return { dom, top: true }
  })

  return { extension, toggleButton }
}
