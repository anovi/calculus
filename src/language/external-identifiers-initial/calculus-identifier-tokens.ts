import { ExternalTokenizer, type InputStream } from '@lezer/lr';

import { isIdentifierChar } from './identifier-char';
import { Identifier } from './calculus-language-parser.terms';

const CONVERT_KEYWORDS = new Set(['in', 'into', 'as', 'to']);

function isConvertKeyword(word: string): boolean {
  return CONVERT_KEYWORDS.has(word.toLowerCase());
}

const SPACE = 32, ZERO = 48, NINE = 57;

function readWord(input: InputStream): string {
  let word = '';
  while (true) {
    const code = input.peek(0);
    if (code < 0 || !isIdentifierChar(code)) break;
    word += String.fromCodePoint(code);
    input.advance();
  }
  return word;
}

function peekWordAt(input: InputStream, offset: number): string {
  let word = '';
  while (true) {
    const code = input.peek(offset);
    if (code < 0 || !isIdentifierChar(code)) break;
    word += String.fromCodePoint(code);
    offset++;
  }
  return word;
}

/** Convert keyword followed by another word is a conversion, not part of the identifier. */
function convertKeywordStartsConversion(input: InputStream): boolean {
  const nextWord = peekWordAt(input, 1);
  if (!isConvertKeyword(nextWord)) return false;

  let offset = 1 + nextWord.length;
  while (input.peek(offset) === SPACE) offset++;
  const after = input.peek(offset);
  return isIdentifierStart(after);
}

function isIdentifierStart(code: number): boolean {
  if (!isIdentifierChar(code)) return false;
  return code < ZERO || code > NINE; // Not a digit
}

export function createIdentifierTokensTokenizer(terms: { Identifier: number }) {
  return new ExternalTokenizer((input: InputStream) => {
    if (!isIdentifierStart(input.peek(0))) return;

    let lastWord = readWord(input);
    if (!lastWord) return;

    // At this moment parser has advanced up to regognized word
    if (!isConvertKeyword(lastWord)) 
    while (input.peek(0) === SPACE) {
      if (convertKeywordStartsConversion(input)) break;

      const afterSpace = input.peek(1);
      if (!isIdentifierChar(afterSpace)) break;

      input.advance();
      const nextWord = readWord(input);
      if (!nextWord) break;
      lastWord = nextWord;
    }

    input.acceptToken(terms.Identifier);
  });
}

/** Wired into the generated parser; term ids come from `calculus-language-parser.terms`. */
export const identifierTokens = createIdentifierTokensTokenizer({ Identifier });
