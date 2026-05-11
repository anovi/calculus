export type ComposerFixture = {
  name: string;
  doc: string;
  expected: number[];
  skip?: boolean;
  only?: boolean;
};

export const composerFixtures: ComposerFixture[] = [
  { name: 'binary', doc: '2+2', expected: [4] },
  { name: 'tertiary', doc: '2 + 2 * 3', expected: [8] },
  { name: 'grouped', doc: '(2 + 2) * 3', expected: [12] },
];

