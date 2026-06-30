import { ExternalTokenizer, type InputStream } from '@lezer/lr';

import { isIdentifierChar } from './identifier-char';
import { Identifier } from './compio-language-parser.terms';
import { NINE, SPACE, ZERO } from './symbols';

function scanWordLength(input: InputStream, offset: number): number {
  let len = 0;
  while (true) {
    const code = input.peek(offset + len);
    if (code < 0 || !isIdentifierChar(code)) break;
    len++;
  }
  return len;
}

function advanceBy(input: InputStream, count: number) {
  for (let i = 0; i < count; i++) input.advance();
}

/**
 * Returns the length of a convert keyword at `offset` when it forms a whole word
 * (`IN` | `in` | `into` | `as` | `to`), else 0.
 */
function matchConvertKeywordWordAt(input: InputStream, offset: number): number {
  const a = input.peek(offset);
  const b = input.peek(offset + 1);

  // in | IN
  if ((a === 105 || a === 73) && (b === 110 || b === 78)) {
    const c = input.peek(offset + 2);
    if (c < 0 || !isIdentifierChar(c)) return 2;
    // into (case-insensitive)
    const d = input.peek(offset + 3);
    if ((c === 116 || c === 84) && (d === 111 || d === 79)) {
      const after = input.peek(offset + 4);
      if (after < 0 || !isIdentifierChar(after)) return 4;
    }
    return 0;
  }

  // as | AS
  if ((a === 97 || a === 65) && (b === 115 || b === 83)) {
    const c = input.peek(offset + 2);
    if (c < 0 || !isIdentifierChar(c)) return 2;
    return 0;
  }

  // to | TO
  if ((a === 116 || a === 84) && (b === 111 || b === 79)) {
    const c = input.peek(offset + 2);
    if (c < 0 || !isIdentifierChar(c)) return 2;
    return 0;
  }

  return 0;
}

function isConvertKeywordWordAt(input: InputStream, offset: number, wordLen: number): boolean {
  const kwLen = matchConvertKeywordWordAt(input, offset);
  return kwLen > 0 && kwLen === wordLen;
}

/** Convert keyword followed by another word is a conversion, not part of the identifier. */
function convertKeywordStartsConversion(input: InputStream): boolean {
  const lead = input.peek(1);
  if (lead !== 105 && lead !== 73 && lead !== 97 && lead !== 65 && lead !== 116 && lead !== 84) {
    return false;
  }

  const kwLen = matchConvertKeywordWordAt(input, 1);
  if (kwLen === 0) return false;

  let offset = 1 + kwLen;
  while (input.peek(offset) === SPACE) offset++;
  return isIdentifierStart(input.peek(offset));
}

function isIdentifierStart(code: number): boolean {
  if (!isIdentifierChar(code)) return false;
  return code < ZERO || code > NINE; // Not a digit
}

export function createIdentifierTokensTokenizer(terms: { Identifier: number }) {
  return new ExternalTokenizer((input: InputStream) => {
    if (!isIdentifierStart(input.peek(0))) return;

    const firstLen = scanWordLength(input, 0);
    if (firstLen === 0) return;

    const firstIsConvertKeyword = isConvertKeywordWordAt(input, 0, firstLen);
    advanceBy(input, firstLen);

    if (!firstIsConvertKeyword) {
      while (input.peek(0) === SPACE) {
        if (convertKeywordStartsConversion(input)) break;

        const afterSpace = input.peek(1);
        if (!isIdentifierChar(afterSpace)) break;

        input.advance();
        const nextLen = scanWordLength(input, 0);
        if (nextLen === 0) break;
        advanceBy(input, nextLen);
      }
    }

    input.acceptToken(terms.Identifier);
  });
}

/** Wired into the generated parser; term ids come from `compio-language-parser.terms`. */
export const identifierTokens = createIdentifierTokensTokenizer({ Identifier });
