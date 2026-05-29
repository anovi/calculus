import { EditorView } from 'codemirror'
import { EditorState, type Extension } from '@codemirror/state'
import { syntaxHighlighting } from '@codemirror/language'
import { placeholder } from '@codemirror/view'
import { autocompletion } from '@codemirror/autocomplete'

import { basicSetup } from './basic-setup'
import { calcClipboard } from './calc-clipboard'
import { calcRanges } from './values-field'
import { calcResultsPlugin } from './values-view-plugin'
import { calculus } from './calculus-language'
import { editorTheme } from './base-theme'
import { formatOnType } from './formatting'
import { unitCompletionSource, variableCompletionSource } from './autocompletion'
import { helpPanel } from './panel'
import { calcSyntaxLinter } from './linter'
import { calculusHighlightStyle } from './calculus-syntax-highlight-tags'

export type CreateEditorOptions = {
  parent: HTMLElement
  doc: string
  extraExtensions?: Extension[]
  panelExtensions?: Extension[]
}

export type EditorInstance = {
  view: EditorView
  extensions: Extension[]
  setDocument: (content: string) => void
}

export function createEditor({
  parent,
  doc,
  extraExtensions = [],
  panelExtensions = [],
}: CreateEditorOptions): EditorInstance {
  const extensions: Extension[] = [
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
    ...extraExtensions,
    syntaxHighlighting(calculusHighlightStyle),
    helpPanel(),
    ...panelExtensions,
    placeholder('Start with a formula or variable…'),
    editorTheme,
    calcSyntaxLinter,
    // safariFocusScrollFix(),
    // emptyLineGutter,
  ]

  const view = new EditorView({
    parent,
    state: EditorState.create({ doc, extensions }),
  })

  return {
    view,
    extensions,
    setDocument(content: string) {
      view.setState(EditorState.create({ doc: content, extensions }))
    },
  }
}
