import { unitsObject } from '../../node_modules/convert/dist/generated/parse-unit.js';

import { CURRENCY_CODES } from './currencies-list';

/** Every unit spelling accepted by the `convert` package (names, symbols, aliases). */
const CONVERT_UNIT_SPELLINGS = Object.freeze(Object.keys(unitsObject));

const canonicalConvertByLower = new Map<string, string>();
for (const unit of CONVERT_UNIT_SPELLINGS) {
  const lower = unit.toLowerCase();
  if (!canonicalConvertByLower.has(lower)) canonicalConvertByLower.set(lower, unit);
}

function normalizeConvertUnit(unit: string): string | null {
  return canonicalConvertByLower.get(unit.toLowerCase()) ?? null;
}

function buildCanonicalUnitByLower(): Map<string, string> {
  const map = new Map<string, string>();
  for (const code of CURRENCY_CODES) {
    map.set(code.toLowerCase(), code);
  }
  for (const unit of CONVERT_UNIT_SPELLINGS) {
    const lower = unit.toLowerCase();
    if (!map.has(lower)) {
      map.set(lower, normalizeConvertUnit(unit) ?? unit);
    }
  }
  return map;
}

const canonicalUnitByLower = buildCanonicalUnitByLower();

/** All physical-unit spellings recognized by the `convert` package. */
export function getConvertUnitSpellings(): readonly string[] {
  return CONVERT_UNIT_SPELLINGS;
}

/** Map lowercase unit text to canonical code (ISO currency or convert unit spelling). */
export function normalizeUnit(unit: string): string | null {
  return canonicalUnitByLower.get(unit.toLowerCase()) ?? null;
}
