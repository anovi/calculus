import { undo, redo, undoDepth, redoDepth } from '@codemirror/commands'
import { showPanel, ViewPlugin, type Panel, type EditorView, type ViewUpdate } from '@codemirror/view'
import type { EditorState, Extension } from '@codemirror/state'

import { setButtonIcon } from './button-icons'

export type DocumentControlsPanelDeps = {
  onToggleDocuments: () => void
  onCreateDocument: () => void
}

export type DocumentControlsPanel = {
  extensions: Extension[]
  toggleButton: HTMLButtonElement
}

type HistoryButtons = {
  undo: HTMLButtonElement
  redo: HTMLButtonElement
}

function syncHistoryButtons(state: EditorState, buttons: HistoryButtons): void {
  buttons.undo.disabled = undoDepth(state) === 0
  buttons.redo.disabled = redoDepth(state) === 0
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
    if (btn.disabled) return
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

  let historyButtons: HistoryButtons | null = null

  const panelExtension = showPanel.of((view: EditorView): Panel => {
    const dom = document.createElement('div')
    dom.className = 'cm-document-controls-panel'

    const start = document.createElement('div')
    start.className = 'cm-document-controls-panel__start'
    start.append(toggleButton, createButton)

    const undoBtn = createHistoryButton(view, 'undo')
    const redoBtn = createHistoryButton(view, 'redo')
    historyButtons = { undo: undoBtn, redo: redoBtn }
    syncHistoryButtons(view.state, historyButtons)

    const end = document.createElement('div')
    end.className = 'cm-document-controls-panel__end'
    end.append(undoBtn, redoBtn)

    dom.append(start, end)
    return { dom, top: true }
  })

  const historyButtonSync = ViewPlugin.fromClass(class {
    update(update: ViewUpdate) {
      if (!historyButtons) return
      syncHistoryButtons(update.state, historyButtons)
    }
  })

  return {
    extensions: [panelExtension, historyButtonSync],
    toggleButton,
  }
}
