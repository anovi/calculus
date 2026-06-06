import { registerSW } from 'virtual:pwa-register'
import { EditorView } from 'codemirror'
import { syntaxTree } from '@codemirror/language'

import { printTree } from './lib/tree'
import { isMobileDevice } from './lib/mobile-device'

import { mountInstallPromptButton } from './pwa'
import { createEditor, createDocumentControlsPanel } from './editor'
import { initializeRatesStore } from './rates-store'
import { AppPreferencesStore, DocumentRepository, DocumentSession } from './documents'
import { DocumentDrawer } from './drawer'
import {
  applyTheme,
  oppositeColorScheme,
  resolveInitialTheme,
  syncThemeToggleButton,
  type ColorScheme,
} from './theme'


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
const repository = new DocumentRepository()
const preferencesStore = new AppPreferencesStore()
const storedColorScheme = await preferencesStore.getColorScheme()
let colorScheme: ColorScheme = resolveInitialTheme(storedColorScheme)
applyTheme(colorScheme, { persistCache: storedColorScheme !== null })

const session = new DocumentSession({ repository, preferencesStore, firstDocumentContent: DEFAULT_DOC })
const initialDocument = await session.initialize()
let drawer: DocumentDrawer | null = null

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
let controlsPanel: ReturnType<typeof createDocumentControlsPanel>

const toggleTheme = () => {
  colorScheme = oppositeColorScheme(colorScheme)
  applyTheme(colorScheme)
  void preferencesStore.setColorScheme(colorScheme)
  syncThemeToggleButton(controlsPanel.themeButton, colorScheme)
  setEditorColorScheme(colorScheme === 'dark')
}

controlsPanel = createDocumentControlsPanel({
  onToggleDocuments: () => {
    drawer?.toggle()
  },
  onCreateDocument: () => {
    void createDocument()
  },
  onToggleTheme: toggleTheme,
  initialTheme: colorScheme,
})

let setEditorColorScheme: (isDark: boolean) => void = () => {}

const editor = createEditor({
  parent: root,
  doc: initialDocument.content,
  isDark: colorScheme === 'dark',
  extraExtensions: [persist, controlsPanel.extensions]
})
setEditorColorScheme = editor.setColorScheme
const { view, setDocument: setEditorDocument } = editor

drawer = new DocumentDrawer({
  toggleButton: controlsPanel.toggleButton,
  onSelectDocument: (id) => {
    void openDocument(id)
  },
  onClose: isMobileDevice()
    ? undefined
    : () => { view.focus() },
})

const applyDocument = (content: string) => {
  isApplyingDocument = true
  setEditorDocument(content)
  isApplyingDocument = false
}

const openDocument = async (id: string) => {
  const doc = await session.openDocument(id);
  applyDocument(doc.content);
  if (!isMobileDevice()) view.focus();
  await refreshDrawer();
}

const createDocument = async () => {
  const doc = await session.createAndOpenDocument()
  applyDocument(doc.content)
  await refreshDrawer()
  drawer?.close()
}

refreshDrawer = async () => {
  const docs = await session.listDocuments()
  const active = session.getActiveDocumentId()
  if (!drawer) return
  drawer.renderDocuments(docs.map((doc) => ({ ...doc, isActive: doc.id === active })))
}

void refreshDrawer()
session.onHashNavigation((id) => {
  void openDocument(id)
})

// @ts-ignore
globalThis.printTree = () => printTree(syntaxTree(view.state))
})() }

registerSW({ immediate: true })
mountInstallPromptButton()

void initializeRatesStore()