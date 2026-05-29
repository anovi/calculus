import { CURRENCIES, CURRENCY_CODES, type CurrencyCode, type CurrencyEntry } from './currencies-list';

export type { CurrencyCode, CurrencyEntry } from './currencies-list';

const CURRENCY_SET: ReadonlySet<string> = new Set(CURRENCY_CODES);

/** Fractional digits for display, derived from {@link CurrencyEntry.numberToBasic} (e.g. 100 → 2). */
const DECIMAL_PLACES_BY_CODE = new Map<string, number>(
	CURRENCIES.flatMap((entry) => {
		const places = decimalPlacesFromNumberToBasic(entry.numberToBasic);
		return places == null ? [] : [[entry.code, places] as const];
	}),
);

function decimalPlacesFromNumberToBasic(numberToBasic: number | undefined): number | null {
	if (numberToBasic == null || !Number.isFinite(numberToBasic) || numberToBasic <= 0) {
		return null;
	}
	const exponent = Math.log10(numberToBasic);
	if (!Number.isInteger(exponent) || exponent < 0) return null;
	return exponent;
}

/** ISO currency display precision from minor-units-per-major (`number_to_basic` in CSV). */
export function getCurrencyDecimalPlaces(code: string): number | undefined {
	return DECIMAL_PLACES_BY_CODE.get(code.toUpperCase());
}

/** Runtime guard so external strings (URLs, persisted snapshots, API rows) can be narrowed safely. */
export function isCurrencyCode(value: string): value is CurrencyCode {
	return CURRENCY_SET.has(value);
}

export function isCurrency(unit: string): unit is CurrencyCode {
	return isCurrencyCode(unit.toUpperCase());
}

export function getCurrencies(): readonly CurrencyEntry[] {
	return CURRENCIES;
}