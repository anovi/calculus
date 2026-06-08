import { EditorView } from 'codemirror'
import { EditorState, type Extension } from '@codemirror/state'
import { syntaxHighlighting } from '@codemirror/language'
import { placeholder } from '@codemirror/view'
import { autocompletion } from '@codemirror/autocomplete'

import { calculus } from '../language' 

import { basicSetup } from './basic-setup'
import { calcClipboard } from './clipboard'
import { calcRanges } from './values-field'
import { calcResultTooltips, calcResultsPlugin } from './result'
import { variableHoverTooltip } from './variables/variable-tooltip'
import { createEditorTheme, reconfigureEditorTheme } from './base-theme'
import { formatOnType } from './formatting'
import { unitCompletionSource, variableCompletionSource } from './autocompletion'
import { helpPanel } from './mobile-toolbar'
import { calcSyntaxLinter } from './linter'
import { renameVariableReferences } from './variables/rename-variable-references'
import { calculusHighlightStyle } from './language-tools/calculus-syntax-highlight-tags'
import { hackSafariTouchSelection } from './safari-selection-hack'

export type CreateEditorOptions = {
  parent: HTMLElement
  doc: string
  isDark?: boolean
  extraExtensions?: Extension[]
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
    renameVariableReferences(),
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
    // safariFocusScrollFix(),
    // emptyLineGutter,
    ...extraExtensions,
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
