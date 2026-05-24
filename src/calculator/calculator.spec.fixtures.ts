import { Range } from "@codemirror/state";

import { pairKey, RatesStore, type CurrencyCode, type PairEntry, type PairKey } from "../rates-store";
import type { CalcValue, MathCalculator } from "./calculator";

/** Currency rates referenced by fixtures below. Keep in sync with `expected` values. */
const MOCK_RATES: Partial<Record<CurrencyCode, Partial<Record<CurrencyCode, number>>>> = {
  USD: { EUR: 0.9 },
  EUR: { USD: 1.12 },
};

/**
 * Builds a `RatesStore` pre-seeded with deterministic fixture rates. Uses the real
 * `RatesStore` class so private-field typing matches, but stubs network + persistence
 * so no I/O happens during tests.
 */
export function createMockRatesStore(): RatesStore {
  const entries = new Map<PairKey, PairEntry>();
  const fetchedAt = Date.now();
  for (const [from, quotes] of Object.entries(MOCK_RATES) as [CurrencyCode, Record<CurrencyCode, number>][]) {
    for (const [to, rate] of Object.entries(quotes) as [CurrencyCode, number][]) {
      entries.set(pairKey(from, to), { rate, date: '2026-05-14', fetchedAt });
    }
  }
  return new RatesStore({
    persistence: {
      load: () => entries,
      save: () => {},
    },
    fetcher: {
      fetchPair: async () => {
        throw new Error('Mock RatesStore: fetchPair should not be called in tests');
      },
      fetchBaseRates: async () => [],
    },
    staleAfterMs: Number.POSITIVE_INFINITY,
  });
}

export type CalculatorFixture = {
  name: string;
  doc: string;
  /**
   * Expected per-row result. Use a string when the exact decimal matters
   * (avoids any float round-trip through the test source).
   */
  expected: (number | string)[];
  /** When set, asserts `CalcValue.unit` per row (use `undefined` for rows without a unit). */
  expectedUnits?: (string | undefined)[];
  skip?: boolean;
  only?: boolean;
  context?: (calculator: MathCalculator, result: Range<CalcValue>[]) => void;
};

export const calculatorFixtures: CalculatorFixture[] = [
  // Operators
  { name: 'Binary', doc: '2+2', expected: [4] },
  { name: 'Tertiary', doc: '2 + 2 * 3', expected: [8] },
  { name: 'Grouping', doc: '(2 + 2) * 3', expected: [12] },
  { name: 'Division', doc: '12 / 3', expected: [4] },
  { name: 'Exponent', doc: '2^4', expected: [16] },
  { name: 'Exponent over multiply', doc: '2*2^3', expected: [16] },
  { name: 'Right-associative exponent', doc: '2^3^2', expected: [512] },
  // Float exponents (real powers)
  {
    name: 'float exponent: square root via power',
    doc: '2^0.5',
    expected: ['1.4142135623730950488'],
  },
  {
    name: 'float exponent: half power of 16',
    doc: '16^0.5',
    expected: [4],
  },
  {
    name: 'float exponent: half power via division',
    doc: '16^(1/2)',
    expected: [4],
  },
  {
    name: 'float exponent with binding',
    doc: 'tax_rate = 0.21\n100^tax_rate',
    expected: [0.21, '2.6302679918953819173'],
  },
  // Negative base & non-integer exponent (undefined in reals → NaN)
  {
    name: 'negative base: half power of -4',
    doc: '(-4)^0.5',
    expected: ['NaN'],
  },
  {
    name: 'negative base: half power via division',
    doc: '(-4)^(1/2)',
    expected: ['NaN'],
  },
  {
    name: 'negative base: sqrt of -4',
    doc: 'sqrt(-4)',
    expected: ['NaN'],
  },
  // Parentheses vs unary minus on exponentiation
  {
    name: 'negative base: square of -4',
    doc: '(-4)^2',
    expected: [16],
  },
  {
    name: 'unary minus binds after power: -4^2',
    doc: '-4^2',
    expected: [-16],
  },
  // Rational exponent on negative base (odd root is real; float 1/3 is approximate)
  {
    name: 'negative base: cube root via (1/3) expressin',
    doc: '(-8)^(1/3)',
    expected: [NaN],
  },
  // root(x, n) — n-th root; degree n is the second argument
  {
    name: 'root: square root of 16',
    doc: 'root(16, 2)',
    expected: [4],
  },
  {
    name: 'root: cube root of 27',
    doc: 'root(27, 3)',
    expected: [3],
  },
  {
    name: 'root: in expression',
    doc: '2 + root(81, 4)',
    expected: [5],
  },
  {
    name: 'root: with binding',
    doc: 'x = 8\nroot(x, 3)',
    expected: [8, 2],
  },
  {
    name: 'root: odd degree of negative base',
    doc: 'root(-8, 3)',
    expected: [-2],
    skip: true,
  },
  {
    name: 'root: even degree of negative base (not real)',
    doc: 'root(-4, 2)',
    expected: ['NaN'],
  },
  {
    name: 'root: second arg 1/2 means 1/n = 2, not half-degree',
    doc: 'root(-4, 1/2)',
    expected: [16],
  },
  {
    name: 'root: degree zero',
    doc: 'root(8, 0)',
    expected: ['NaN'],
  },
  // Functions
  { name: 'sqrt', doc: 'sqrt(16)', expected: [4] },
  { name: 'sqrt in expression', doc: '2 + sqrt(16)', expected: [6] },
  {
    name: 'sqrt with binding',
    doc: 'x = 9\nsqrt(x)',
    expected: [9, 3],
  },
  // Bindings
  {
    name: 'Expression with binded value',
    doc: 'some = 10\nother = some + 2',
    expected: [10, 12]
  },   {
    name: 'Multiple operations with binded value',
    doc: `tax_rate = 0.21\nnet = 100\ngross = net + net * tax_rate`,
    expected: [0.21, 100, 121]
  },
  {
    name: 'value with unit (standalone)',
    doc: '100USD',
    expected: [100],
    expectedUnits: ['USD'],
  },
  {
    name: 'value with unit (binding)',
    doc: 'width = 12 EUR',
    expected: [12],
    expectedUnits: ['EUR'],
  },
  // Numbers
  {
    name: 'plain number has no unit',
    doc: '42',
    expected: [42],
    expectedUnits: [undefined],
  },
  {
    name: 'float',
    doc: '0.123',
    expected: [0.123],
  },
  {
    name: 'negative',
    doc: '-2',
    expected: [-2],
  },
  {
    name: 'negative in division',
    doc: '-40 / 2',
    expected: [-20],
  },
  {
    name: 'negative in addition',
    doc: '2 + -3',
    expected: [-1],
  },
  // Units
  {
    name: 'float with unit',
    doc: '3.5JPY',
    expected: [3.5],
    expectedUnits: ['JPY'],
  },
  {
    name: 'currency convertion',
    doc: '10 USD in EUR',
    expected: [9],
  },
  {
    name: 'currency convertion via expression',
    doc: '10 USD + 1 EUR',
    expected: [11.12],
  },
  {
    name: 'units convertion',
    doc: '10 km in mi',
    expected: [6.2137119223733395],
  },
  {
    name: 'compatible units: length addition with conversion',
    doc: '10 cm + 1 m',
    expected: [110],
    expectedUnits: ['cm'],
  },
  {
    name: 'incompatible units: length + currency',
    doc: '20 cm + 10 EUR',
    expected: ['NaN'],
    expectedUnits: ['cm'],
  },
  {
    name: 'incompatible units: length + mass',
    doc: '10 kg + 5 m',
    expected: ['NaN'],
    expectedUnits: ['kg'],
  },
  {
    name: 'incompatible units: length * currency',
    doc: '10 cm * 2 EUR',
    expected: ['NaN'],
    expectedUnits: ['cm'],
  },
  // Formatting
  {
    name: 'formatting',
    doc: '1 999 232',
    expected: [1_999_232],
  },
];

