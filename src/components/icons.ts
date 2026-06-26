import divIcon from '../assets/icons/div.svg?raw'
import equlIcon from '../assets/icons/equl.svg?raw'
import gearIcon from '../assets/icons/gear.svg?raw'
import menuIcon from '../assets/icons/menu.svg?raw'
import minusIcon from '../assets/icons/minus.svg?raw'
import moonIcon from '../assets/icons/moon.svg?raw'
import parenthesisIcon from '../assets/icons/parenthesis.svg?raw'
import plusIcon from '../assets/icons/plus.svg?raw'
import redoIcon from '../assets/icons/redo.svg?raw'
import rootIcon from '../assets/icons/root.svg?raw'
import sunIcon from '../assets/icons/sun.svg?raw'
import timesIcon from '../assets/icons/times.svg?raw'
import undoIcon from '../assets/icons/undo.svg?raw'
import exponentIcon from '../assets/icons/exponent.svg?raw'
import sumIcon from '../assets/icons/sum.svg?raw'
import functionIcon from '../assets/icons/function.svg?raw'

export type IconName =
  | 'plus'
  | 'minus'
  | 'times'
  | 'div'
  | 'root'
  | 'equl'
  | 'parenthesis'
  | 'exponent'
  | 'undo'
  | 'redo'
  | 'menu'
  | 'gear'
  | 'sun'
  | 'sum'
  | 'moon'
  | 'function'

const ICONS: Record<IconName, string> = {
  plus: plusIcon,
  sum: sumIcon,
  minus: minusIcon,
  times: timesIcon,
  exponent: exponentIcon,
  div: divIcon,
  root: rootIcon,
  equl: equlIcon,
  parenthesis: parenthesisIcon,
  undo: undoIcon,
  redo: redoIcon,
  menu: menuIcon,
  gear: gearIcon,
  sun: sunIcon,
  moon: moonIcon,
  function: functionIcon,
}

export function iconSvg(name: IconName): string {
  return ICONS[name]
}
