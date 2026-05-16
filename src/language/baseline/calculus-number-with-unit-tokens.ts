import { ExternalTokenizer, type InputStream } from '@lezer/lr';

import { PrefixTree } from '../../lib/prefix-tree';
import { Unit } from './calculus-language.terms';
import { CURRENCIES } from '../currencies';
import { getConvertUnitSpellings } from '../../units/convert-package';

export type UnitTokenizerTerms = {
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

export function createUnitTokenizer(terms: UnitTokenizerTerms) {
  return new ExternalTokenizer((input: InputStream) => {
    const suffixLen = unitSuffixTrie.longestMatchUtf16((rel) => input.peek(rel));
    if (suffixLen > 0 && hasUnitSuffixBoundary(input, suffixLen)) {
      for (let k = 0; k < suffixLen; k++) input.advance();
      input.acceptToken(terms.Unit);
      return;
    }

    const standaloneLen = standaloneUnitTrie.longestMatchUtf16((rel) => input.peek(rel));
    if (standaloneLen === 0 || !hasUnitSuffixBoundary(input, standaloneLen)) return;

    for (let k = 0; k < standaloneLen; k++) input.advance();
    input.acceptToken(terms.Unit);
  });
}

/** Wired into the generated parser; term ids come from `calculus-language.terms`. */
export const numberWithUnitTokens = createUnitTokenizer({ Unit });
