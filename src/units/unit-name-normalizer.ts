import { unitsObject } from '../../node_modules/convert/dist/generated/parse-unit.js';

import { CURRENCIES, type CurrencyEntry } from './currencies-list';

/** Every unit spelling accepted by the `convert` package (names, symbols, aliases). */
export const CANONICAL_UNIT_SPELLINGS = Object.freeze(Object.keys(unitsObject));

function buildCanonicalUnitByLower(
  map: Map<string, string[]>,
  collection: readonly string[]
): Map<string, string[]> {
  for (const unit of collection) {
    const lower = unit.toLowerCase();
    let arr = map.get(lower);
    if (!arr) arr = [];
    arr.push(unit);
    map.set(lower, arr);
  }
  return map;
}

function buildCanonicalCurrencyByLower(
  map: Map<string, string[]>,
  collection: readonly CurrencyEntry[]
): Map<string, string[]> {
  for (const unit of collection) {
    const lower = unit.code.toLowerCase();
    let arr = map.get(lower);
    if (!arr) arr = [];
    arr.push(unit.code);
    map.set(lower, arr);
    if (unit.symbol) {
      if (unit.symbol === '$' && unit.code !== 'USD') continue;
      let arr = map.get(unit.symbol);
      if (!arr) arr = [];
      arr.push(unit.code);
      map.set(unit.symbol, arr);
    }
  }
  return map;
}

let currencies = buildCanonicalCurrencyByLower(new Map(), CURRENCIES);
const canonicalUnitByLower = buildCanonicalUnitByLower(currencies, CANONICAL_UNIT_SPELLINGS);

/**
 * Returns canonical unit code (ISO currency or measurement unit spelling).
 * Case insensitive but returns multiple variants when ambiguity met.
 * E.g. "MS" can be either "Ms" or "ms".
 */
export function normalizeUnit(unit: string): string | string[] | null {
  const candidates = canonicalUnitByLower.get(unit.toLowerCase()) ?? null;
  if (candidates == null || candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];
  return candidates.find(c => c === unit) || candidates;
}
