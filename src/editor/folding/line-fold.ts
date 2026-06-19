import { codeFolding, foldedRanges, foldService, syntaxTree } from '@codemirror/language'
import type { Extension } from '@codemirror/state'
import type { EditorState } from '@codemirror/state'
import { keymap } from "@codemirror/view"
import type { SyntaxNode } from '@lezer/common'

import { terms } from '../../language'
import { getCalcRanges } from '../values-field'
import { findRange } from '../../lib/codemirror/rangeset'
import { foldKeymap } from './line-keymap'


/** True when a binding expression on this line is folded. */
export function isBindingExpressionFolded(
  state: EditorState,
  line: { from: number; to: number },
): boolean {
  let folded = false
  foldedRanges(state).between(line.from, line.to, (from) => {
    if (from > line.from) folded = true
  })
  return folded
}

/** Fold range for a binding expression: from after `=` / `:` through the expression. */
export function bindingExpressionFoldRange(node: SyntaxNode): { from: number; to: number } | null {
  const equalSign = node.getChild('EqualSign') || node.getChild('ColonSign')
  if (!equalSign) return { from: node.from, to: node.to }
  let expr = equalSign.nextSibling
  while (expr && expr.type.id === terms.Comment) expr = expr.nextSibling
  if (!expr) return null
  const from = expr.from
  const to = expr.to
  return from < to ? { from, to } : null
}

function bindingFoldOnLine(state: EditorState, lineStart: number, lineEnd: number) {
  let found: { from: number; to: number } | null = null
  const results = getCalcRanges(state);
  const result = findRange(results, (_val, from) => from >= lineStart && from < lineEnd);
  if (result && !result.value.primitive)
  syntaxTree(state).iterate({
    from: result.from,
    to: result.to,
    enter(node) {
      if (node.type.id !== terms.Binding && node.type.id !== terms.NoBinding) return
      const range = bindingExpressionFoldRange(node.node)
      if (!range || range.from < lineStart || range.to > lineEnd) return
      found = range
    },
  })
  return found
}

const lineFolder = codeFolding({
  placeholderDOM(_view, onclick) {
    const dom = document.createElement('span');
    dom.innerHTML = ' ';
    dom.className = 'foldLine__expander'
    dom.addEventListener('click', onclick);
    return dom;
  },
})

// import downIcon from '../../assets/icons/chevron_down.svg?raw'
// const gutterFolder = foldGutter({
//   markerDOM(open) {
//     return toggleButton(downIcon, open);
//   },
// })
// function toggleButton(svg: string, open: boolean): HTMLSpanElement {
//   const markup = svg.replace(/\bfill="black"/gi, 'fill="currentColor"')
//   const wrap = document.createElement('span')
//   wrap.className = 'cm-foldGutter__button'
//   if (!open) wrap.classList.add('is-closed')
//   wrap.style.width = `${18}px`
//   wrap.style.height = `${18}px`
//   wrap.setAttribute('aria-hidden', 'true')
//   wrap.innerHTML = markup
//   return wrap
// }

/** Code folding for binding expressions */
export function calcBindingFold(): Extension {
  return [
    foldService.of(bindingFoldOnLine),
    keymap.of(foldKeymap),
    lineFolder,
    // gutterFolder
  ]
}

