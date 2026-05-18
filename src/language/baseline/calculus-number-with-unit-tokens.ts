import { ExternalTokenizer, type InputStream } from '@lezer/lr';

import { PrefixTree } from '../../lib/prefix-tree';
import { CURRENCY_CODES, getConvertUnitSpellings } from '../../units';
import { Unit } from './calculus-language.terms';

export type UnitTokenizerTerms = {
  Unit: number;
};

const convertUnits = getConvertUnitSpellings();

/** All units/currencies (`100USD`, standalone `EUR` in convert targets). */
const unitsPrefixTrie = PrefixTree.fromWords([...CURRENCY_CODES, ...convertUnits]);

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

/** Matches Lezer `@whitespace` / grammar `space { @whitespace+ }`. */
function isSkippedWhitespace(code: number) {
  return code === 9 || code === 10 || code === 11 || code === 12 || code === 13 || code === 32;
}

/** Standalone `in` is the convert keyword; inch still matches as a number suffix (`12in`). */
function isStandaloneInKeyword(input: InputStream, len: number) {
  return (
    len === 2 &&
    isSkippedWhitespace(input.peek(-1)) &&
    (input.peek(0) === 105 || input.peek(0) === 73) &&
    (input.peek(1) === 110 || input.peek(1) === 78)
  );
}

export function createUnitTokenizer(terms: UnitTokenizerTerms) {
  return new ExternalTokenizer((input: InputStream) => {
    const suffixLen = unitsPrefixTrie.longestMatchUtf16((rel) => input.peek(rel));

    if (suffixLen === 0) return;
    if (!hasUnitSuffixBoundary(input, suffixLen)) return;
    if (isStandaloneInKeyword(input, suffixLen)) return;

    for (let k = 0; k < suffixLen; k++) input.advance();
    input.acceptToken(terms.Unit);
  });
}

/** Wired into the generated parser; term ids come from `calculus-language.terms`. */
export const numberWithUnitTokens = createUnitTokenizer({ Unit });
