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
  { name: 'binary', doc: '2+2', expected: [4] },
  { name: 'tertiary', doc: '2 + 2 * 3', expected: [8] },
  { name: 'grouped', doc: '(2 + 2) * 3', expected: [12] },
  { name: 'expression with binded value', doc: 'some = 10\nother = some + 2', expected: [10, 12]},
  { name: 'multiple operations with binded value', doc: `tax_rate = 0.21\nnet = 100\ngross = net + net * tax_rate`, expected: [0.21, 100, 121] }
];

