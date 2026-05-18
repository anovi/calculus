import assert from 'node:assert';
import { EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { LRLanguage } from '@codemirror/language';

import { parser } from '../language';
import { unitCompletionSite } from './unit-autocomplete';

const calcLanguage = LRLanguage.define({
  name: 'calculus',
  parser,
});

function siteAt(doc: string, pos: number = doc.length) {
  const state = EditorState.create({
    doc,
    extensions: [calcLanguage],
  });
  syntaxTree(state);
  return unitCompletionSite(state, pos);
}

describe('unitCompletionSite', () => {
  it('suffix: inside Unit after a number', () => {
    const doc = '100USD';
    assert.deepStrictEqual(siteAt(doc, doc.length), { kind: 'suffix', from: 3 });
  });

  it('suffix: partial unit letters after number', () => {
    const doc = '100 us';
    assert.deepStrictEqual(siteAt(doc, doc.length), { kind: 'suffix', from: 4 });
  });

  it('convert: target Unit node', () => {
    const doc = '12 EUR in USD';
    assert.deepStrictEqual(siteAt(doc, doc.length), { kind: 'convert', from: 10 });
  });

  it('convert: partial target after convert keyword', () => {
    const doc = '12 EUR in U';
    assert.deepStrictEqual(siteAt(doc, doc.length), { kind: 'convert', from: 10 });
  });

  it('returns null outside unit contexts', () => {
    assert.strictEqual(siteAt('tax_rate = 0.21'), null);
    assert.strictEqual(siteAt('sqrt(2)'), null);
  });
});
