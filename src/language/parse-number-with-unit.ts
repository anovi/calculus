import { PrefixTree } from '../lib/prefix-tree';
import { CURRENCIES } from './currencies';
import {
  getConvertUnitSpellings,
  normalizeConvertUnit,
} from '../units/convert-package';

function buildCanonicalUnitByLower(): Map<string, string> {
  const map = new Map<string, string>();
  for (const code of CURRENCIES) {
    map.set(code.toLowerCase(), code);
  }
  for (const unit of getConvertUnitSpellings()) {
    const lower = unit.toLowerCase();
    if (!map.has(lower)) {
      map.set(lower, normalizeConvertUnit(unit) ?? unit);
    }
  }
  return map;
}

const canonicalUnitByLower = buildCanonicalUnitByLower();

const unitSuffixTrie = PrefixTree.fromWords([
  ...CURRENCIES,
  ...getConvertUnitSpellings(),
]);

/** Map lowercase unit text to canonical code (ISO currency or convert unit spelling). */
export function normalizeUnit(unit: string): string | null {
  return canonicalUnitByLower.get(unit.toLowerCase()) ?? null;
}

function numberPartLength(text: string): number {
  if (text.length === 0) return -1;
  const first = text.charCodeAt(0);
  if (first < 48 || first > 57) return -1;

  let i = 0;
  while (i < text.length) {
    const c = text.charCodeAt(i);
    if (c >= 48 && c <= 57) {
      i++;
      continue;
    }
    break;
  }

  // Float
  if (
    i < text.length &&
    text.charCodeAt(i) === 46 && // .
    i + 1 < text.length &&
    text.charCodeAt(i + 1) >= 48 &&
    text.charCodeAt(i + 1) <= 57
  ) {
    i++;
    while (i < text.length) {
      const c = text.charCodeAt(i);
      if (c >= 48 && c <= 57) {
        i++;
        continue;
      }
      break;
    }
  }

  return i;
}

/**
 * Parse a `NumberWithUnit` source slice (e.g. `100USD`, `12.5 EUR`, `10 km`) into value and unit.
 * Matching follows the external number-with-unit tokenizer (longest suffix, case-insensitive).
 */
export function parseNumberWithUnit(
  text: string,
): { value: number; unit: string } | null {
  const numLen = numberPartLength(text);
  if (numLen <= 0) return null;

  let i = numLen;
  if (text[i] === ' ') i++;
  if (i >= text.length) return null;

  const unitLen = unitSuffixTrie.longestMatchUtf16((rel) => {
    const pos = i + rel;
    if (pos >= text.length) return -1;
    return text.charCodeAt(pos);
  });
  if (unitLen === 0) return null;

  const unit = normalizeUnit(text.slice(i, i + unitLen));
  if (!unit) return null;

  const value = Number.parseFloat(text.slice(0, numLen));
  if (!Number.isFinite(value)) return null;

  return { value, unit };
}
