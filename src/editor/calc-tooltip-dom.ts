import type { ResultTooltipContent } from './calc-result-format'

/** Tooltip body: optional name, value, optional full unit label. */
export function buildCalcTooltipContentDom(content: ResultTooltipContent): HTMLElement {
  const dom = document.createElement('div')
  dom.className = 'cm-calc-result-tooltip cm-tooltip-section'
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
