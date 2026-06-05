import { syntaxTree } from '@codemirror/language'
import type { EditorState } from '@codemirror/state'
import { hoverTooltip, type EditorView, type Tooltip } from '@codemirror/view'
import type { SyntaxNode } from '@lezer/common'

import type { CalcValue } from '../calculator'
import { terms, type TermValue } from '../language'
import { buildCalcTooltipContentDom } from './calc-tooltip-dom'
import { getResultTooltipContent, type ResultTooltipContent } from './calc-result-format'
import { calcValueAtAnchor, getCalcRanges } from './values-field'

const identifierUseParents = new Set<TermValue>([
  terms.ExpExpression,
  terms.AddExpression,
  terms.MulExpression,
  terms.ConvertExpression,
  terms.ArgList,
])

export function isVariableIdentifierUse(node: SyntaxNode): boolean {
  if (node.type.id !== terms.Identifier) return false
  const parent = node.parent
  if (parent == null) return false
  return identifierUseParents.has(parent.type.id as TermValue)
}

/** Binding definition for `name` that is in scope at `beforePos`. */
export function calcValueForVariableName(
  state: EditorState,
  name: string,
  beforePos: number,
): CalcValue | null {
  const ranges = getCalcRanges(state)
  let best: CalcValue | null = null
  let bestFrom = -1
  ranges.between(0, beforePos, (from, _to, val) => {
    if (val.name !== name || from >= beforePos) return
    if (from > bestFrom) {
      bestFrom = from
      best = val
    }
  })
  return best
}

function variableTooltipContent(name: string, value: CalcValue): ResultTooltipContent | null {
  const body = getResultTooltipContent(value)
  if (body != null) return { ...body, name }
  if (value.error != null) return { name, value: 'Error' }
  return null
}

function tooltipForVariable(view: EditorView, from: number, to: number, name: string): Tooltip | null {
  const value = calcValueForVariableName(view.state, name, from)
  if (value == null) return null
  const content = variableTooltipContent(name, value)
  if (content == null) return null
  const anchor = Math.floor((from + to) / 2)
  return {
    pos: anchor,
    above: true,
    create() {
      return {
        dom: buildCalcTooltipContentDom(content),
        getCoords: () => view.coordsAtPos(anchor)!,
      }
    },
  }
}

export const variableHoverTooltip = hoverTooltip(
  (view, pos) => {
    if (calcValueAtAnchor(view.state, pos) != null) return null
    const node = syntaxTree(view.state).resolveInner(pos, -1)
    if (!isVariableIdentifierUse(node)) return null
    const name = view.state.sliceDoc(node.from, node.to)
    if (!name) return null
    return tooltipForVariable(view, node.from, node.to, name)
  },
  { hideOnChange: true },
)
