/** Matches compio `IdentifierChar` in compio-language.grammar. */
export function isIdentifierChar(code: number): boolean {
  if (code < 0) return false; // end of input / invalid code point
  if (
    (code >= 65 && code <= 90) || // A–Z
    (code >= 97 && code <= 122) || // a–z
    (code >= 48 && code <= 57) || // 0–9
    code === 95 // underscore (_)
  ) {
    return true;
  }
  // Unicode letters and symbols (U+00A1 … U+10FFFF), excluding ASCII controls and punctuation
  return code >= 0xa1 && code <= 0x10ffff;
}
