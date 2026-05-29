import type { CurrencyEntry } from "./types";

export type { CurrencyEntry };

/** Parsed from `currencies-list.csv` at config load; inlined via `define` in `vite.config.ts`. */
declare const __CURRENCIES__: readonly CurrencyEntry[];

/**
 * Circulating currencies from `currencies-list.csv`.
 *
 * @see https://en.wikipedia.org/wiki/List_of_circulating_currencies
 */
export const CURRENCIES: readonly CurrencyEntry[] = __CURRENCIES__;

export type CurrencyCode = CurrencyEntry['code'];

/** ISO codes derived from {@link CURRENCIES}. */
export const CURRENCY_CODES: readonly CurrencyCode[] = CURRENCIES.map((c) => c.code);