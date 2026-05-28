import type { Operation } from './panel/operations-dictionary'

import divIcon from '../assets/icons/div.svg?raw'
import equlIcon from '../assets/icons/equl.svg?raw'
import menuIcon from '../assets/icons/menu.svg?raw'
import minusIcon from '../assets/icons/minus.svg?raw'
import parenthesisIcon from '../assets/icons/parenthesis.svg?raw'
import plusIcon from '../assets/icons/plus.svg?raw'
import redoIcon from '../assets/icons/redo.svg?raw'
import rootIcon from '../assets/icons/root.svg?raw'
import timesIcon from '../assets/icons/times.svg?raw'
import undoIcon from '../assets/icons/undo.svg?raw'

export type ButtonIconName =
  | 'plus'
  | 'minus'
  | 'times'
  | 'div'
  | 'root'
  | 'equl'
  | 'parenthesis'
  | 'undo'
  | 'redo'
  | 'menu'

const ICONS: Record<ButtonIconName, string> = {
  plus: plusIcon,
  minus: minusIcon,
  times: timesIcon,
  div: divIcon,
  root: rootIcon,
  equl: equlIcon,
  parenthesis: parenthesisIcon,
  undo: undoIcon,
  redo: redoIcon,
  menu: menuIcon,
}

export const OPERATION_ICON: Record<Operation, ButtonIconName> = {
  plus: 'plus',
  minus: 'minus',
  multiplication: 'times',
  division: 'div',
  exponent: 'root',
  euqal: 'equl',
  parentheses: 'parenthesis',
}

function iconMarkup(svg: string): string {
  return svg
    .replace(/\bfill="black"/gi, 'fill="currentColor"')
    .replace(/<svg\b/, '<svg class="cm-button-icon__svg"')
}

export function setButtonIcon(button: HTMLButtonElement, name: ButtonIconName): void {
  button.replaceChildren()
  const wrap = document.createElement('span')
  wrap.className = 'cm-button-icon'
  wrap.setAttribute('aria-hidden', 'true')
  wrap.innerHTML = iconMarkup(ICONS[name])
  button.append(wrap)
}
