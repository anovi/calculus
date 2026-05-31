import { undo, redo, undoDepth, redoDepth } from '@codemirror/commands'
import { showPanel, ViewPlugin, type Panel, type EditorView, type ViewUpdate } from '@codemirror/view'
import type { EditorState, Extension } from '@codemirror/state'

import { createIconButton } from '../components/icon-button'
import { bindFocusPreservingButton } from './focus-preserving-button'
import { syncThemeToggleButton } from '../theme'
import type { ColorScheme } from '../theme'

export type DocumentControlsPanelDeps = {
  onToggleDocuments: () => void
  onCreateDocument: () => void
  onToggleTheme: () => void
  initialTheme: ColorScheme
}

export type DocumentControlsPanel = {
  extensions: Extension[]
  toggleButton: HTMLButtonElement
  themeButton: HTMLButtonElement
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
  const btn = createIconButton({
    icon: kind,
    ariaLabel: kind === 'undo' ? 'Undo' : 'Redo',
    className: 'cm-document-controls__button cm-document-controls__history-button',
  })
  bindFocusPreservingButton(btn, () => {
    if (btn.disabled) return
    const run = kind === 'undo' ? undo : redo
    run({
      state: view.state,
      dispatch(transaction) {
        view.dispatch(transaction)
      },
    })
  })
  return btn
}

export function createDocumentControlsPanel(deps: DocumentControlsPanelDeps): DocumentControlsPanel {
  const toggleButton = createIconButton({
    icon: 'menu',
    ariaLabel: 'Open documents',
    id: 'documents-toggle',
    className: 'cm-document-controls__button cm-document-controls__menu-button',
    onClick: () => deps.onToggleDocuments(),
  })
  toggleButton.setAttribute('aria-expanded', 'false')

  const createButton = createIconButton({
    icon: 'plus',
    ariaLabel: 'Create new document',
    id: 'documents-create',
    className: 'cm-document-controls__button',
    onClick: () => deps.onCreateDocument(),
  })

  const themeButton = createIconButton({
    icon: 'sun',
    ariaLabel: 'Switch theme',
    id: 'theme-toggle',
    className: 'cm-document-controls__button cm-document-controls__theme-button',
    onClick: () => deps.onToggleTheme(),
  })
  syncThemeToggleButton(themeButton, deps.initialTheme)

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
    end.append(undoBtn, redoBtn, themeButton)

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
    themeButton,
  }
}
