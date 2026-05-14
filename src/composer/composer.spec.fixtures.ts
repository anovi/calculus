import { Range } from "@codemirror/state";

import { pairKey } from "../rates/pair-key";
import type { CurrencyCode, PairEntry, PairKey } from "../rates/types";
import { RatesStore } from "../rates-store";
import type { CalcValue, MathComposer } from "./composer";

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

export type ComposerFixture = {
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
  context?: (composer: MathComposer, result: Range<CalcValue>[]) => void;
};

export const composerFixtures: ComposerFixture[] = [
  // Operators
  { name: 'Binary', doc: '2+2', expected: [4] },
  { name: 'Tertiary', doc: '2 + 2 * 3', expected: [8] },
  { name: 'Grouping', doc: '(2 + 2) * 3', expected: [12] },
  { name: 'Division', doc: '12 / 3', expected: [4] },
  { name: 'Exponent', doc: '2^4', expected: [16] },
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
  {
    name: 'plain number has no unit',
    doc: '42',
    expected: [42],
    expectedUnits: [undefined],
  },
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
    // only: true
  },
];

