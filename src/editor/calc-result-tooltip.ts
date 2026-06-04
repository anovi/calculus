import { combineConfig, Facet, type Extension } from '@codemirror/state'
import {
  closeHoverTooltips,
  hoverTooltip,
  tooltips,
  type EditorView as EditorViewType,
  type Rect,
  type Tooltip
} from '@codemirror/view'

import type { CalcValue } from '../calculator'
import { isMobileDevice } from '../lib/mobile-device'
import { copyTextToClipboard } from './copy-text'
import { buildCalcTooltipContentDom } from './calc-tooltip-dom'
import { formatResult, getResultTooltipContent } from './calc-result-format'
import { bindFocusPreservingButton } from './focus-preserving-button'
import { getCalcRanges } from './values-field'


export type CalcResultTooltipConfig = {
  /** Delay before the tooltip appears on pill hover (ms). */
  hoverTime?: number
}

const defaultConfig: Required<CalcResultTooltipConfig> = {
  hoverTime: 400,
}

export const calcResultTooltipConfig = Facet.define<
  CalcResultTooltipConfig,
  Required<CalcResultTooltipConfig>
>({
  combine(configs) {
    return combineConfig(configs, defaultConfig)
  },
})

function calcValueAtAnchor(view: EditorViewType, pos: number): CalcValue | null {
  const ranges = getCalcRanges(view.state)
  let found: CalcValue | null = null
  const doc = view.state.doc
  ranges.between(0, doc.length, (from, _to, val) => {
    if (doc.lineAt(from).to === pos) found = val
  })
  return found
}

function buildMobileActionsDom(
  view: EditorViewType,
  anchorPos: number,
  value: CalcValue,
): HTMLElement {
  const actions = document.createElement('div')
  actions.className = 'cm-calc-result-tooltip__actions cm-tooltip-section'

  const copyBtn = document.createElement('button')
  copyBtn.type = 'button'
  copyBtn.className = 'cm-calc-result-tooltip__action'
  copyBtn.textContent = 'Copy'
  bindFocusPreservingButton(copyBtn, () => {
    const res = copyTextToClipboard(formatResult(value))
    res.clear()
  })

  const editBtn = document.createElement('button')
  editBtn.type = 'button'
  editBtn.className = 'cm-calc-result-tooltip__action'
  editBtn.textContent = 'Edit'
  bindFocusPreservingButton(editBtn, () => {
    view.dispatch({
      effects: closeHoverTooltips,
      selection: { anchor: anchorPos },
    })
    if (!view.hasFocus) view.focus()
  })

  actions.append(copyBtn, editBtn)
  return actions
}

function buildTooltipDom(
  view: EditorViewType,
  anchorPos: number,
  value: CalcValue,
  content: { name?: string; value: string; unit?: string },
): HTMLElement {
  const wrap = document.createElement('div')
  wrap.className = 'cm-calc-result-tooltip-wrap'
  wrap.appendChild(buildCalcTooltipContentDom(content))
  if (isMobileDevice()) {
    wrap.appendChild(buildMobileActionsDom(view, anchorPos, value))
  }
  return wrap
}

function pillCoords(view: EditorViewType, anchorPos: number): Rect | null {
  let node: Node|null = view.domAtPos(anchorPos, -1).node;
  let pill: Node|null = null;

  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement
    }
    if (node?.nodeType === Node.ELEMENT_NODE) {
      if ((node as HTMLElement).classList.contains('cm-calc-result')) {
        pill = node
        break;
      }
      else node = node.nextSibling;
    }
  }

  if (pill) {
    const r = (pill as HTMLElement).getBoundingClientRect()
    return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
  }

  return null;
}

function tooltipForValue(
  view: EditorViewType,
  anchorPos: number,
  value: CalcValue,
): Tooltip | null {
  const content = getResultTooltipContent(value)
  if (content == null) return null
  return {
    pos: anchorPos,
    above: true,
    create() {
      return {
        dom: buildTooltipDom(view, anchorPos, value, content),
        // getCoords: () => view.coordsAtPos(anchorPos)!,
        getCoords: () => pillCoords(view, anchorPos) ?? view.coordsAtPos(anchorPos)!,

      }
    },
  }
}

export const calcResultHoverTooltip = hoverTooltip(
  (view, pos) => {
    const value = calcValueAtAnchor(view, pos)
    if (value == null || value.error != null) return null
    return tooltipForValue(view, pos, value)
  },
  { hideOnChange: true },
)

/** CodeMirror tooltip for calculation result pills. */
export function calcResultTooltips(config: CalcResultTooltipConfig = {}): Extension {
  return [
    calcResultTooltipConfig.of(config),
    tooltips(),
    calcResultHoverTooltip,
  ]
}
