import { CURRENCY_CODES, type CurrencyCode } from './currencies-list';

export type { CurrencyCode, CurrencyEntry } from './currencies-list';

const CURRENCY_SET: ReadonlySet<string> = new Set(CURRENCY_CODES);

/** Runtime guard so external strings (URLs, persisted snapshots, API rows) can be narrowed safely. */
export function isCurrencyCode(value: string): value is CurrencyCode {
	return CURRENCY_SET.has(value);
}

export function isCurrency(unit: string): unit is CurrencyCode {
	return isCurrencyCode(unit.toUpperCase());
}
