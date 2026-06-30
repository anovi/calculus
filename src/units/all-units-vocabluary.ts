import { PrefixTree } from "../lib/prefix-tree";
import { CURRENCY_CODES, CURRENCY_SYMBOLS } from "./currencies-list";
import { CANONICAL_UNIT_SPELLINGS } from "./unit-name-normalizer";


const knownUnitSpellings = PrefixTree.fromWords([
    // ...CURRENCY_SYMBOLS,
    ...CURRENCY_CODES,
    ...CANONICAL_UNIT_SPELLINGS
]);

const knownCurrencySymbolsSpellings = PrefixTree.fromWords([
    ...CURRENCY_SYMBOLS,
]);

/**
 * Length of the longest known unit/currency spelling starting at `peek(0)` (e.g. `USD`, `km`).
 * Case-insensitive; returns 0 when no known spelling matches.
 */
export function longestRecognizedUnitSpelling(peek: (offset: number) => number): number {
    return knownUnitSpellings.longestMatchUtf16(peek);
}

export function longestRecognizedCurrencySymbolSpelling(peek: (offset: number) => number): number {
    return knownCurrencySymbolsSpellings.longestMatchUtf16(peek);
}