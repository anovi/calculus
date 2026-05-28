import { registerSW } from 'virtual:pwa-register'

import { EditorView } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { syntaxHighlighting } from '@codemirror/language'
import { syntaxTree } from '@codemirror/language'

import {
  basicSetup,
  calcClipboard,
  calcRanges,
  calcResultsPlugin,
  calculus,
  editorTheme,
  // safariFocusScrollFix,
  formatOnType,
  unitCompletionSource,
  variableCompletionSource,
} from './editor'
import { helpPanel } from './editor/panel'
import { initializeRatesStore } from './rates-store'
import { calculusHighlightStyle } from './language/baseline/calculus-lang-highlighting'
import { autocompletion } from '@codemirror/autocomplete'
import { printTree } from './lib/tree'
import { calcSyntaxLinter } from './editor/linter'
import { DocumentRepository } from './documents/document-repository'
import { DocumentSession } from './documents/document-session'
import { DocumentDrawer } from './editor/document-drawer'
import { AppPreferencesStore } from './documents/app-preferences-store'

const DEFAULT_DOC = `// Welcome to calculus.
// Each line is either a comment, an expression, or a named binding.

tax_rate = 0.21
net = 100
gross = net + net * tax_rate
`

const root = document.querySelector<HTMLDivElement>('#editor')
if (!root) {
  throw new Error('#editor missing')
}
const createDocumentButton = document.querySelector<HTMLButtonElement>('#documents-create')
if (!createDocumentButton) {
  throw new Error('#documents-create missing')
}

const repository = new DocumentRepository()
const preferencesStore = new AppPreferencesStore()
const session = new DocumentSession({ repository, preferencesStore, firstDocumentContent: DEFAULT_DOC })
const initialDocument = await session.initialize()

let persistTimer: ReturnType<typeof setTimeout> | null = null
let refreshDrawer: () => Promise<void> = async () => {}
let isApplyingDocument = false
const persist = EditorView.updateListener.of((update) => {
  if (!update.docChanged) return
  if (isApplyingDocument) return
  if (persistTimer !== null) clearTimeout(persistTimer)
  persistTimer = setTimeout(() => {
    persistTimer = null
    void session.saveActiveDocument(update.state.doc.toString())
      .then(() => refreshDrawer())
      .catch((error) => {
        console.warn('Failed to persist document:', error)
      })
  }, 120)
})

{ (() => {
const view = new EditorView({
  parent: root,
  state: EditorState.create({
    doc: initialDocument.content,
    extensions: [
      basicSetup(),
      calculus(),
      autocompletion({
        maxRenderedOptions: 20,
        override: [unitCompletionSource, variableCompletionSource],
      }),
      formatOnType(),
      calcRanges(),
      calcClipboard(),
      calcResultsPlugin,
      persist,
      syntaxHighlighting(calculusHighlightStyle),
      helpPanel(),
      editorTheme,
      calcSyntaxLinter,
      // safariFocusScrollFix(),
      // emptyLineGutter,
    ],
  }),
})

const drawer = new DocumentDrawer({
  onSelectDocument: (id) => {
    void openDocument(id)
  },
})

const applyDocument = (content: string) => {
  isApplyingDocument = true
  view.dispatch({
    changes: {
      from: 0,
      to: view.state.doc.length,
      insert: content,
    },
  })
  isApplyingDocument = false
}

const openDocument = async (id: string) => {
  const doc = await session.openDocument(id)
  applyDocument(doc.content)
  await refreshDrawer()
}

const createDocument = async () => {
  const doc = await session.createAndOpenDocument()
  applyDocument(doc.content)
  await refreshDrawer()
}

refreshDrawer = async () => {
  const docs = await session.listDocuments()
  const active = session.getActiveDocumentId()
  drawer.renderDocuments(docs.map((doc) => ({ ...doc, isActive: doc.id === active })))
}

void refreshDrawer()
session.onHashNavigation((id) => {
  void openDocument(id)
})
createDocumentButton.addEventListener('click', () => {
  void createDocument()
})

// @ts-ignore
globalThis.printTree = () => printTree(syntaxTree(view.state))
})() }

registerSW({ immediate: true })

void initializeRatesStore()