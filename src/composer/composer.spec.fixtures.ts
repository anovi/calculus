import { Range } from "@codemirror/state";

import type { CalcValue, MathComposer } from "./composer";

export type ComposerFixture = {
  name: string;
  doc: string;
  expected: number[];
  skip?: boolean;
  only?: boolean;
  context?: (composer: MathComposer, result: Range<CalcValue>[]) => void;
};

export const composerFixtures: ComposerFixture[] = [
  // Operations
  { name: 'Binary', doc: '2+2', expected: [4] },
  { name: 'Tertiary', doc: '2 + 2 * 3', expected: [8] },
  { name: 'Grouping', doc: '(2 + 2) * 3', expected: [12] },
  { name: 'Division', doc: '12 / 3', expected: [4] },
  { name: 'Exponent', doc: '2^4', expected: [16] },
  { name: 'sqrt', doc: 'sqrt(16)', expected: [4] },
  { name: 'sqrt in expression', doc: '2 + sqrt(16)', expected: [6] },
  {
    name: 'sqrt with binding',
    doc: 'x = 9\nsqrt(x)',
    expected: [9, 3]
  },
  // Binding
  {
    name: 'Expression with binded value',
    doc: 'some = 10\nother = some + 2',
    expected: [10, 12]
  }, {
    name: 'Multiple operations with binded value',
    doc: `tax_rate = 0.21\nnet = 100\ngross = net + net * tax_rate`,
    expected: [0.21, 100, 121]
  },
];

