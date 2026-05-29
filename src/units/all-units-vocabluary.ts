import { PrefixTree } from "../lib/prefix-tree";
import { CURRENCY_CODES } from "./currencies-list";
import { CANONICAL_UNIT_SPELLINGS } from "./unit-name-normalizer";


const knownUnitSpellings = PrefixTree.fromWords([
    ...CURRENCY_CODES,
    ...CANONICAL_UNIT_SPELLINGS
]);

/**
 * Length of the longest known unit/currency spelling starting at `peek(0)` (e.g. `USD`, `km`).
 * Case-insensitive; returns 0 when no known spelling matches.
 */
export function longestRecognizedUnitSpelling(peek: (offset: number) => number): number {
    return knownUnitSpellings.longestMatchUtf16(peek);
}