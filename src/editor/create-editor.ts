import { EditorView } from 'codemirror'
import { EditorState, type Extension } from '@codemirror/state'
import { syntaxHighlighting } from '@codemirror/language'
import { placeholder } from '@codemirror/view'
import { autocompletion } from '@codemirror/autocomplete'

import { basicSetup } from './basic-setup'
import { calcClipboard } from './calc-clipboard'
import { calcRanges } from './values-field'
import { calcResultTooltips } from './calc-result-tooltip'
import { variableHoverTooltip } from './variable-tooltip'
import { calcResultsPlugin } from './values-view-plugin'
import { calculus } from './calculus-language'
import { createEditorTheme, reconfigureEditorTheme } from './base-theme'
import { formatOnType } from './formatting'
import { unitCompletionSource, variableCompletionSource } from './autocompletion'
import { helpPanel } from './panel'
import { calcSyntaxLinter } from './linter'
import { calculusHighlightStyle } from './calculus-syntax-highlight-tags'
import { hackSafariTouchSelection } from './safari-selection-hack'

export type CreateEditorOptions = {
  parent: HTMLElement
  doc: string
  isDark?: boolean
  extraExtensions?: Extension[]
  panelExtensions?: Extension[]
}

export type EditorInstance = {
  view: EditorView
  extensions: Extension[]
  setDocument: (content: string) => void
  setColorScheme: (isDark: boolean) => void
}

export function createEditor({
  parent,
  doc,
  isDark = true,
  extraExtensions = [],
  panelExtensions = [],
}: CreateEditorOptions): EditorInstance {
  let currentIsDark = isDark

  const buildExtensions = (dark: boolean): Extension[] => [
    basicSetup(),
    calculus(),
    autocompletion({
      maxRenderedOptions: 20,
      override: [unitCompletionSource, variableCompletionSource],
    }),
    hackSafariTouchSelection,
    formatOnType(),
    calcRanges(),
    calcClipboard(),
    calcResultsPlugin,
    calcResultTooltips(),
    variableHoverTooltip,
    syntaxHighlighting(calculusHighlightStyle),
    helpPanel(),
    placeholder('Start with a formula or variable…'),
    createEditorTheme(dark),
    calcSyntaxLinter,
    ...panelExtensions,
    ...extraExtensions,
    // safariFocusScrollFix(),
    // emptyLineGutter,
  ]

  const extensions = buildExtensions(currentIsDark)

  const view = new EditorView({
    parent,
    state: EditorState.create({ doc, extensions }),
  })

  return {
    view,
    extensions,
    setDocument(content: string) {
      view.setState(EditorState.create({ doc: content, extensions: buildExtensions(currentIsDark) }))
    },
    setColorScheme(nextIsDark: boolean) {
      currentIsDark = nextIsDark
      reconfigureEditorTheme(view, nextIsDark)
    },
  }
}
