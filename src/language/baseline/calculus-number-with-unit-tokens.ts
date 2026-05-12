import { ExternalTokenizer, type InputStream } from '@lezer/lr';

import { PrefixTree } from '../../lib/prefix-tree';
import { NumberWithUnit, Unit } from './calculus-language.terms';
import { CURRENCIES } from '../currencies';

export type NumberWithUnitTokenizerTerms = {
  NumberWithUnit: number;
  Unit: number;
};

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

export function createNumberWithUnitTokenizer(terms: NumberWithUnitTokenizerTerms) {
  return new ExternalTokenizer((input: InputStream) => {
    const numLen = numberSpanLength(input);
    if (numLen >= 0) {
      let i = numLen;
      if (input.peek(i) === 32) i++;

      const curLen = currencyTrie.longestMatchUtf16((rel) => input.peek(i + rel));
      if (curLen > 0) {
        const total = i + curLen;
        for (let k = 0; k < total; k++) input.advance();
        input.acceptToken(terms.NumberWithUnit);
        return;
      }
    }

    const unitLen = currencyTrie.longestMatchUtf16((rel) => input.peek(rel));
    if (unitLen === 0) return;

    for (let k = 0; k < unitLen; k++) input.advance();
    input.acceptToken(terms.Unit);
  });
}

/** Wired into the generated parser; term ids come from `calculus-language.terms`. */
export const numberWithUnitTokens = createNumberWithUnitTokenizer({ NumberWithUnit, Unit });
