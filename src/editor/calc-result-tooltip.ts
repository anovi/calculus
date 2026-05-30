import { combineConfig, Facet, type Extension } from '@codemirror/state'
import {
  activateHover,
  closeHoverTooltips,
  EditorView,
  hoverTooltip,
  tooltips,
  type EditorView as EditorViewType,
  type Rect,
  type Tooltip,
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

function pillCoords(view: EditorViewType, anchorPos: number): Rect | null {
  const pill = view.dom.querySelector(
    `.cm-calc-result[data-calc-anchor="${anchorPos}"] .cm-calc-result__pill`,
  ) as HTMLElement | null
  if (!pill) return null
  const r = pill.getBoundingClientRect()
  return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }
}

function buildTooltipDom(content: { value: string; unit?: string }): HTMLElement {
  const dom = document.createElement('div')
  dom.className = 'cm-calc-result-tooltip'
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

const calcResultTooltipTheme = EditorView.baseTheme({
  '& .cm-tooltip.cm-calc-result-tooltip': {
    padding: '6px 10px',
    fontVariantNumeric: 'tabular-nums',
  },
  '& .cm-calc-result-tooltip__value': {
    fontWeight: '600',
  },
  '& .cm-calc-result-tooltip__unit': {
    marginTop: '2px',
    fontSize: '0.9em',
    opacity: '0.85',
  },
})

/** CodeMirror tooltip for calculation result pills. */
export function calcResultTooltips(config: CalcResultTooltipConfig = {}): Extension {
  return [
    calcResultTooltipConfig.of(config),
    tooltips(),
    calcResultHoverTooltip,
    calcResultTooltipTheme,
  ]
}

/** Show the result tooltip after the configured hover delay (for widget pills). */
export function bindResultPillTooltip(
  pill: HTMLElement,
  view: EditorViewType,
  anchorPos: number,
): void {
  let hoverTimer: ReturnType<typeof setTimeout> | undefined

  pill.addEventListener('mouseenter', () => {
    const { hoverTime } = view.state.facet(calcResultTooltipConfig)
    hoverTimer = setTimeout(() => {
      hoverTimer = undefined
      activateHover(view, anchorPos, 1, {
        tooltip: calcResultHoverTooltip,
        until: (tr) => tr.docChanged,
      })
    }, hoverTime)
  })

  pill.addEventListener('mouseleave', () => {
    if (hoverTimer != null) clearTimeout(hoverTimer)
    view.dispatch({ effects: closeHoverTooltips })
  })
}
