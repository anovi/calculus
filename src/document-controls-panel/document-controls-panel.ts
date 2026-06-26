import { undo, redo, undoDepth, redoDepth } from '@codemirror/commands'
import { showPanel, ViewPlugin, type Panel, type EditorView, type ViewUpdate } from '@codemirror/view'
import type { EditorState, Extension } from '@codemirror/state'

import type { AppContext } from '../app'
import { mountAppMenu } from './app-menu'
import { createIconButton } from '../components/icon-button'
import { bindFocusPreservingButton } from '../components/focus-preserving-button'
import { mountFunctionsMenu } from '../functions-menu'
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

export function createDocumentControlsPanel(ctx: AppContext): DocumentControlsPanel {
  const toggleButton = createIconButton({
    icon: 'menu',
    ariaLabel: 'Open documents',
    id: 'documents-toggle',
    className: 'cm-document-controls__button cm-document-controls__menu-button',
    onClick: () => ctx.ui.drawer?.toggle(),
  })
  toggleButton.setAttribute('aria-expanded', 'false')

  const createButton = createIconButton({
    icon: 'plus',
    ariaLabel: 'Create new document',
    id: 'documents-create',
    className: 'cm-document-controls__button',
    onClick: () => { void ctx.documents.create() },
  })

  const appMenuButton = createIconButton({
    icon: 'gear',
    ariaLabel: 'App menu',
    id: 'app-menu-toggle',
    className: 'cm-document-controls__button cm-document-controls__app-menu-button',
  })

  const functionsButton = createIconButton({
    icon: 'function',
    ariaLabel: 'Functions',
    id: 'functions-menu-toggle',
    className: 'cm-document-controls__button cm-document-controls__functions-button',
  })

  let historyButtons: HistoryButtons | null = null
  let unmountFunctionsMenu: (() => void) | null = null
  let unmountAppMenu: (() => void) | null = null

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
    end.append(functionsButton, undoBtn, redoBtn, appMenuButton)

    unmountFunctionsMenu?.()
    unmountFunctionsMenu = mountFunctionsMenu(functionsButton, view).destroy

    unmountAppMenu?.()
    unmountAppMenu = mountAppMenu(appMenuButton, ctx)

    dom.append(start, end)
    return {
      dom,
      top: true,
      destroy: () => {
        unmountFunctionsMenu?.()
        unmountFunctionsMenu = null
        unmountAppMenu?.()
        unmountAppMenu = null
      },
    }
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
