import { ExternalTokenizer, type InputStream } from '@lezer/lr';

import { PrefixTree } from '../../lib/prefix-tree';
import { NumberWithUnit, Unit } from './calculus-language.terms';
import { CURRENCIES } from '../currencies';
import { getConvertUnitSpellings } from '../../units/convert-package';

export type NumberWithUnitTokenizerTerms = {
  NumberWithUnit: number;
  Unit: number;
};

const convertUnits = getConvertUnitSpellings();

/** All units/currencies that may follow a number (`100USD`, `5 km`). */
const unitSuffixTrie = PrefixTree.fromWords([...CURRENCIES, ...convertUnits]);

/**
 * Units/currencies that may appear alone (`12 EUR in USD`). Single-letter abbrs (e.g. `s`, `w`)
 * are omitted so they are not taken from identifiers/bindings; `in` is omitted because it is the
 * convert keyword (inch still works as a number suffix, e.g. `12in`).
 */
const standaloneUnitTrie = PrefixTree.fromWords([
  ...CURRENCIES,
  ...convertUnits.filter(
    (unit) => unit.length > 1 && unit.toLowerCase() !== 'in',
  ), // `in` is the convert keyword (inch still works as a number suffix, e.g. `12in`)
]);

function isDigit(code: number) {
  return code >= 48 && code <= 57;
}

function isIdentifierChar(code: number) {
  return (
    (code >= 65 && code <= 90) ||  // A-Z
    (code >= 97 && code <= 122) || // a-z
    (code >= 48 && code <= 57) ||  // 0-9
    code === 95                    // _
  );
}

/** Unit/currency tokens must not continue into an Identifier (e.g. `s` in `sqrt`). */
function hasUnitSuffixBoundary(input: InputStream, endOffset: number) {
  const next = input.peek(endOffset);
  return next < 0 || !isIdentifierChar(next);
}

/**
 * Scans a Lezer {@link InputStream} from the current position: integer, or `digits '.' digits+`
 * (same shape as the grammar's Integer / Float). Returns total length in code units, or -1 if no number.
 */
function numberSpanLength(input: InputStream): number {
  if (!isDigit(input.peek(0))) return -1;
  let i = 0;
  while (isDigit(input.peek(i))) i++;
  if (input.peek(i) === 46 && isDigit(input.peek(i + 1))) {
    i++;
    while (isDigit(input.peek(i))) i++;
  }
  return i;
}

export function createNumberWithUnitTokenizer(terms: NumberWithUnitTokenizerTerms) {
  return new ExternalTokenizer((input: InputStream) => {
    const numLen = numberSpanLength(input);
    if (numLen >= 0) {
      let i = numLen;
      if (input.peek(i) === 32) i++;

      const curLen = unitSuffixTrie.longestMatchUtf16((rel) => input.peek(i + rel));
      if (curLen > 0 && hasUnitSuffixBoundary(input, i + curLen)) {
        const total = i + curLen;
        for (let k = 0; k < total; k++) input.advance();
        input.acceptToken(terms.NumberWithUnit);
        return;
      }
    }

    const unitLen = standaloneUnitTrie.longestMatchUtf16((rel) => input.peek(rel));
    if (unitLen === 0 || !hasUnitSuffixBoundary(input, unitLen)) return;

    for (let k = 0; k < unitLen; k++) input.advance();
    input.acceptToken(terms.Unit);
  });
}

/** Wired into the generated parser; term ids come from `calculus-language.terms`. */
export const numberWithUnitTokens = createNumberWithUnitTokenizer({ NumberWithUnit, Unit });
