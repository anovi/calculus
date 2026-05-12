import { Range } from "@codemirror/state";

import type { CalcValue, MathComposer } from "./composer";

export type ComposerFixture = {
  name: string;
  doc: string;
  expected: number[];
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
    expected: [9, 3]
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
];

