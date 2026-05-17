import type { CurrencyCode } from './types';
import { isCurrencyCode } from './types';

export function isCurrency(unit: string): unit is CurrencyCode {
	return isCurrencyCode(unit.toUpperCase());
}
