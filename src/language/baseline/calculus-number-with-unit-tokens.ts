import { ExternalTokenizer, type InputStream } from '@lezer/lr';

import { longestRecognizedUnitSpelling } from '../../units';
import { PercentSuffix, Unit } from './calculus-language.terms';

export type NumberWithUnitTokenizerTerms = {
  Unit: number;
  PercentSuffix: number;
};

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

/** Postfix `%` on a number (`20%`); spaced `%` stays binary modulo (`10 % 3`). */
function tryPercentSuffix(input: InputStream, terms: NumberWithUnitTokenizerTerms) {
  if (input.peek(0) !== 37) return false;
  if (!isDigit(input.peek(-1))) return false;
  input.advance();
  input.acceptToken(terms.PercentSuffix);
  return true;
}

export function createNumberWithUnitTokensTokenizer(terms: NumberWithUnitTokenizerTerms) {
  return new ExternalTokenizer((input: InputStream) => {
    if (tryPercentSuffix(input, terms)) return;

    const suffixLen = longestRecognizedUnitSpelling((rel) => input.peek(rel));

    if (suffixLen === 0) return;
    if (!hasUnitSuffixBoundary(input, suffixLen)) return;
    if (isStandaloneInKeyword(input, suffixLen)) return;

    for (let k = 0; k < suffixLen; k++) input.advance();
    input.acceptToken(terms.Unit);
  });
}

/** @deprecated Use {@link createNumberWithUnitTokensTokenizer}. */
export function createUnitTokenizer(terms: { Unit: number }) {
  return createNumberWithUnitTokensTokenizer({ Unit: terms.Unit, PercentSuffix });
}

/** Wired into the generated parser; term ids come from `calculus-language.terms`. */
export const numberWithUnitTokens = createNumberWithUnitTokensTokenizer({ Unit, PercentSuffix });
