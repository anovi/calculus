export { RatesStore } from "./rates/store";
export type {
	RatesFetcher,
	RatesPersistence,
	RatesStoreDeps,
} from "./rates/store";
export type {
	CurrencyCode,
	PairEntry,
	PairKey,
	PairState,
} from "./rates/types";
export { STALE_AFTER_MS, WARMUP_QUOTES } from "./rates/types";
export { pairKey, parsePairKey } from "./rates/pair-key";

import { RatesStore } from "./rates/store";

/** Default app-wide singleton. Consumers import this directly; tests can mock it via vi.mock + vi.hoisted. */
export const ratesStore = new RatesStore();

let initPromise: Promise<void> | null = null;

/**
 * Bootstrap the rates store: hydrates from localStorage (already done by the singleton constructor),
 * then warms up EUR and USD base tables in parallel. Idempotent — subsequent calls return the same promise.
 */
export function initializeRatesStore(): Promise<void> {
	if (initPromise === null) {
		initPromise = ratesStore.warmup();
	}
	return initPromise;
}
