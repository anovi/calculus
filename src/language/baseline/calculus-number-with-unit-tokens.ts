import { ExternalTokenizer, type InputStream } from '@lezer/lr';

import { PrefixTree } from '../../lib/prefix-tree';
import { NumberWithUnit } from './calculus-language.terms';
import { CURRENCIES } from '../currencies';

const currencyTrie = PrefixTree.fromWords(CURRENCIES);

function isDigit(code: number) {
  return code >= 48 && code <= 57;
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

export function createNumberWithUnitTokenizer(numberWithUnitTerm: number) {
  return new ExternalTokenizer((input: InputStream) => {
    const numLen = numberSpanLength(input);
    if (numLen < 0) return;

    let i = numLen;
    if (input.peek(i) === 32) i++;

    const curLen = currencyTrie.longestMatchUtf16((rel) => input.peek(i + rel));
    if (curLen === 0) return;

    const total = i + curLen;
    for (let k = 0; k < total; k++) input.advance();
    input.acceptToken(numberWithUnitTerm);
  });
}

/** Wired into the generated parser; term id comes from `calculus-language.terms`. */
export const numberWithUnitTokens = createNumberWithUnitTokenizer(NumberWithUnit);
