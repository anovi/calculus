import { bench, describe } from 'vitest';

import { parser as parserExternalUnits } from '../language/baseline/calculus-language';
import { parser as parserInlineUnits } from '../language/inline-units/calculus-language';

/** ISO codes (subset) cycled so every line contains `NumberWithUnit` tokens and arithmetic. */
const CODES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CHF',
  'AUD',
  'CAD',
  'SEK',
  'NOK',
  'DKK',
] as const;

function buildUnitHeavyDoc(lineCount: number): string {
  const lines: string[] = [];
  for (let i = 0; i < lineCount; i++) {
    const whole = 10 + (i % 5000);
    const u0 = CODES[i % CODES.length];
    const u1 = CODES[(i + 3) % CODES.length];
    const frac = `${(i % 7) + 1}.${(i % 9)}`;
    // Mix glued and spaced unit forms; binary ops force expression structure.
    lines.push(`${whole}${u0} + ${frac} ${u1} * 2`);
  }
  return lines.join('\n');
}

/** Large enough to dominate JIT noise; adjust if benches become too slow in CI. */
const DOC = buildUnitHeavyDoc(4000);

describe('parse expressions with units (external tokenizer vs inline grammar)', () => {
  bench('external tokenizer (`calculus-language.grammar`)', () => {
    parserExternalUnits.parse(DOC);
  });

  bench('inline unit tokens (`calculus-language.grammar`)', () => {
    parserInlineUnits.parse(DOC);
  });
});
