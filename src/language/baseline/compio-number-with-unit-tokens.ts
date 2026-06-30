import { ExternalTokenizer, Stack, type InputStream } from '@lezer/lr';

import { longestRecognizedUnitSpelling } from '../../units';
import { isIdentifierChar } from './identifier-char';
import { PercentSuffix, Unit, Identifier } from './compio-language-parser.terms';
import { COLON, EQUALS, SPACE } from './symbols';
import { CURRENCY_SYMBOLS_SET } from '../../units/currencies-list';
import { longestRecognizedCurrencySymbolSpelling } from '../../units/all-units-vocabluary';

export type NumberWithUnitTokenizerTerms = {
  Unit: number;
  PercentSuffix: number;
};

function isDigit(code: number) {
  return code >= 48 && code <= 57;
}

function isEqualsSymbol(code: number) {
  return code === EQUALS || code === COLON;
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
  return new ExternalTokenizer((input: InputStream, stack: Stack) => {
    if (tryPercentSuffix(input, terms)) return;

    let isSymbol = false;
    let suffixLen = longestRecognizedUnitSpelling((rel) => input.peek(rel));
    if (suffixLen === 0) {
      suffixLen = longestRecognizedCurrencySymbolSpelling((rel) => input.peek(rel));
      if (suffixLen === 0) return;
      isSymbol = true;
    }
    // console.log('pos', stack.pos)
    // console.log('--canShift:', stack.canShift(Identifier))
    // console.log('suffixLen', suffixLen)

    if (isSymbol && (input.peek(suffixLen) === SPACE || isDigit(input.peek(suffixLen))))  {
      // console.log('IS SYMBOL')
    } else {
      if (!hasUnitSuffixBoundary(input, suffixLen)) return;
      if (isStandaloneInKeyword(input, suffixLen)) return;
    }

    if (!isSymbol && stack.canShift(Identifier)) return

    let offset = suffixLen;
    while (input.peek(offset) === SPACE) offset++;

    if (!isEqualsSymbol(input.peek(offset))) {
      for (let k = 0; k < suffixLen; k++) input.advance();
      input.acceptToken(terms.Unit);
    }
    
  });
}

/** Wired into the generated parser; term ids come from `compio-language-parser.terms`. */
export const numberWithUnitTokens = createNumberWithUnitTokensTokenizer({ Unit, PercentSuffix });
