import type { IconName } from '../../components/icons'
import type { Operation } from './operations-dictionary'

export const OPERATION_ICON: Record<Operation, IconName> = {
  plus: 'plus',
  minus: 'minus',
  multiplication: 'times',
  division: 'div',
  exponent: 'root',
  euqal: 'equl',
  parentheses: 'parenthesis',
}
