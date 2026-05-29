import type { CurrencyCode } from '../units';

/** Canonical key for a directional currency pair: `"FROM->TO"` (uppercase). */
export type PairKey = string;

/** A cached rate plus when it arrived. */
export type PairEntry = {
	/** Units of the quote currency per one unit of the base currency. */
	rate: number;
	/** API rate date, e.g. "2026-05-13". */
	date: string;
	/** Local wall-clock ms when this entry was last successfully fetched. */
	fetchedAt: number;
};

/** Payload delivered to per-pair subscribers. */
export type PairState = {
	entry: PairEntry | null;
	isFetching: boolean;
};

/** Frankfurter publishes daily; treat anything older than 24h as stale. */
export const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

/**
 * Quotes pre-fetched at startup for both EUR and USD bases.
 * Covers the majors most likely to appear in calculator conversions.
 */
export const WARMUP_QUOTES: readonly CurrencyCode[] = [
	"EUR",
	"USD",
	"GBP",
	"JPY",
	"CHF",
	"CAD",
	"AUD",
	"NZD",
	"CNY",
	"INR",
	"BRL",
	"MXN",
	"KRW",
	"SEK",
	"NOK",
	"DKK",
	"PLN",
	"HUF",
	"CZK",
	"RON",
	"TRY",
	"ZAR",
	"SGD",
	"HKD",
	"ILS",
	"THB",
	"IDR",
	"PHP",
];
