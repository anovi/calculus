import { combineConfig, Facet, type Extension } from '@codemirror/state'
import {
  hoverTooltip,
  tooltips,
  type EditorView as EditorViewType,
  type Tooltip
} from '@codemirror/view'

import type { CalcValue } from '../calculator'
import { getResultTooltipContent } from './calc-result-format'
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

function buildTooltipDom(content: { name?: string; value: string; unit?: string }): HTMLElement {
  const dom = document.createElement('div')
  dom.className = 'cm-calc-result-tooltip'
  if (content.name) {
    const nameEl = document.createElement('div')
    nameEl.className = 'cm-calc-result-tooltip__name'
    nameEl.textContent = content.name
    dom.appendChild(nameEl)
  }
  const valueEl = document.createElement('div')
  valueEl.className = 'cm-calc-result-tooltip__value'
  valueEl.textContent = content.value
  dom.appendChild(valueEl)
  if (content.unit) {
    const unitEl = document.createElement('div')
    unitEl.className = 'cm-calc-result-tooltip__unit'
    unitEl.textContent = content.unit
    dom.appendChild(unitEl)
  }
  return dom
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
        dom: buildTooltipDom(content),
        getCoords: () => view.coordsAtPos(anchorPos)!,
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