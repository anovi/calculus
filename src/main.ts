import { registerSW } from 'virtual:pwa-register'

import { EditorView } from 'codemirror'
import { EditorState } from '@codemirror/state'
import { LRLanguage, LanguageSupport, syntaxHighlighting } from '@codemirror/language'

import { parser } from './language'
import { calcRanges, calcResultsPlugin, unitAutocompletion } from './editor'
import './editor.css'
import './editor/calculus-syntax-highlight.css'
import { initializeRatesStore } from './rates-store'
import { calculusHighlightStyle } from './language/baseline/calculus-lang-highlighting'
import { basicSetup } from './editor/basic-setup'

/** localStorage key used to persist the editor doc across reloads. */
const STORAGE_KEY = 'calculus:doc'

const DEFAULT_DOC = `// Welcome to calculus.
// Each line is either a comment, an expression, or a named binding.

tax_rate = 0.21
net = 100
gross = net + net * tax_rate
`

const calcLanguage = LRLanguage.define({
  name: 'calculus',
  parser,
})

function calculus(): LanguageSupport {
  return new LanguageSupport(calcLanguage)
}

function loadDoc(): string {
  try {
    const cached = localStorage.getItem(STORAGE_KEY)
    if (cached !== null) return cached
  } catch {
    // Storage may be disabled (private mode, quota); fall through to default.
  }
  return DEFAULT_DOC
}

function saveDoc(doc: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, doc)
  } catch {
    // Ignore quota / availability errors; persistence is best-effort.
  }
}

const root = document.querySelector<HTMLDivElement>('#editor')
if (!root) {
  throw new Error('#editor missing')
}

const persist = EditorView.updateListener.of((update) => {
  if (update.docChanged) saveDoc(update.state.doc.toString())
})

new EditorView({
  parent: root,
  state: EditorState.create({
    doc: loadDoc(),
    extensions: [
      basicSetup(),
      calculus(),
      unitAutocompletion(),
      calcRanges(),
      calcResultsPlugin,
      persist,
      syntaxHighlighting(calculusHighlightStyle),
    ],
  }),
})

registerSW({ immediate: true })

void initializeRatesStore()
