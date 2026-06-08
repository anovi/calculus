import { combineConfig, Facet, type Extension } from '@codemirror/state'
import {
  closeHoverTooltips,
  hoverTooltip,
  type EditorView as EditorViewType,
  type Rect,
  type Tooltip
} from '@codemirror/view'

import type { CalcValue } from '../../calculator'
import { isMobileDevice } from '../../lib/mobile-device'
import { copyTextToClipboard } from '../clipboard'
import { buildCalcTooltipContentDom } from './result-tooltip-dom'
import { formatResult, getResultTooltipContent } from './result-format'
import { bindFocusPreservingButton } from '../../components/focus-preserving-button'
import { calcValueAtAnchor } from '../values-field'
import { resultPillAt, setResultPillActive } from './result-pill-dom'
import { editorTooltipExtensions } from '../viewport-insets'


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
  const wrap = resultPillAt(view, anchorPos)?.closest('.cm-calc-result')
  if (!wrap) return null
  const r = wrap.getBoundingClientRect()
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
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
        getCoords: () => pillCoords(view, anchorPos) ?? view.coordsAtPos(anchorPos)!,
        mount: () => setResultPillActive(view, anchorPos, true),
        destroy: () => setResultPillActive(view, anchorPos, false),
      }
    },
  }
}

export const calcResultHoverTooltip = hoverTooltip(
  (view, pos) => {
    const value = calcValueAtAnchor(view.state, pos)
    if (value == null || value.error != null) return null
    return tooltipForValue(view, pos, value)
  },
  { hideOnChange: true },
)

/** CodeMirror tooltip for calculation result pills. */
export function calcResultTooltips(config: CalcResultTooltipConfig = {}): Extension {
  return [
    calcResultTooltipConfig.of(config),
    ...editorTooltipExtensions(),
    calcResultHoverTooltip,
  ]
}
