import { PrefixTree } from "../lib/prefix-tree";
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

export const CURRENCY_SYMBOLS: string[] = CURRENCIES.map((c) => c.symbol).filter(s => s) as string[];

export const CURRENCY_SYMBOLS_SET: ReadonlySet<string> = new Set(CURRENCY_SYMBOLS);

// const tree = new Map<string, string[]>();

// for (let index = 0; index < CURRENCIES.length; index++) {
//     const curEntry = CURRENCIES[index];
//     tree.set(curEntry.code, curEntry.code);
//     if (curEntry.symbol) tree.set(curEntry.symbol, curEntry);
// }

// export const CURRENCY_NAMES_TO_ENTRY_MAP = tree;