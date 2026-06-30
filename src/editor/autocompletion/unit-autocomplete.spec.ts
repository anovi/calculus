import assert from 'node:assert';
import { EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { LRLanguage } from '@codemirror/language';
import { CompletionContext } from '@codemirror/autocomplete';

import { parser } from '../../language';
import { isCurrency } from '../../units';
import {
  sourceUnitForConvertTarget,
  unitCompletionSite,
  unitCompletionSource,
} from '../autocompletion';

const calcLanguage = LRLanguage.define({
  name: 'compio',
  parser,
});

function stateAt(doc: string) {
  const state = EditorState.create({
    doc,
    extensions: [calcLanguage],
  });
  syntaxTree(state);
  return state;
}

function siteAt(doc: string, pos: number = doc.length) {
  return unitCompletionSite(stateAt(doc), pos);
}

function sourceUnitAt(doc: string, pos: number = doc.length) {
  return sourceUnitForConvertTarget(stateAt(doc), pos);
}

function completionAt(doc: string, pos: number = doc.length, explicit = true) {
  const state = stateAt(doc);
  return unitCompletionSource(new CompletionContext(state, pos, explicit));
}

function applyText(option: { apply?: unknown; label: string }): string {
  const r = typeof option.apply === 'string' ? option.apply : option.label;
  console.log(r)
  return r
}

describe('sourceUnitForConvertTarget', () => {
  it('resolves unit from NumberWithUnit', () => {
    assert.strictEqual(sourceUnitAt('12 EUR in USD'), 'EUR');
    assert.strictEqual(sourceUnitAt('12 EUR in U'), 'EUR');
    assert.strictEqual(sourceUnitAt('100 m in k'), 'm');
  });

  it('resolves unit from nested conversion', () => {
    assert.strictEqual(sourceUnitAt('12 EUR in USD in RSD'), 'USD');
    assert.strictEqual(sourceUnitAt('100 cm in m in km'), 'm');
  });

  it('returns null when value has no unit', () => {
    assert.strictEqual(sourceUnitAt('10 in EUR'), null);
  });

  it('returns null outside convert target', () => {
    assert.strictEqual(sourceUnitAt('100 us'), null);
  });
});

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

describe('unitCompletionSource', () => {
  it('returns options for a suffix unit prefix', async () => {
    const doc = '100 us';
    const result = await Promise.resolve(completionAt(doc));
    assert.ok(result);
    assert.ok(result.options.length > 0);
    assert.strictEqual(result.from, 4);
  });

  it('suffix: suggests both measurement and currency units', async () => {
    const result = await Promise.resolve(completionAt('100 us'));
    assert.ok(result);
    const applies = result.options.map(applyText);
    assert.ok(applies.some((u) => isCurrency(u)));
    assert.ok(applies.some((u) => !isCurrency(u)));
  });

  it('convert with currency source: suggests currencies only', async () => {
    const result = await Promise.resolve(completionAt('12 EUR in U'));
    assert.ok(result);
    assert.ok(result.options.length > 0);
    assert.ok(result.options.every((o) => isCurrency(applyText(o))));
    assert.ok(!result.options.some((o) => applyText(o) === 'm'));
  });

  it('convert with length source: suggests compatible measurement units only', async () => {
    const result = await Promise.resolve(completionAt('100 m in k'));
    assert.ok(result);
    assert.ok(result.options.length > 0);
    assert.ok(result.options.every((o) => !isCurrency(applyText(o))));
    assert.ok(!result.options.some((o) => applyText(o) === 'EUR'));
  });

  it('convert without source unit: suggests all units', async () => {
    const result = await Promise.resolve(completionAt('10 in EUR'));
    assert.ok(result);
    const applies = result.options.map(applyText);
    assert.ok(applies.some((u) => isCurrency(u)));
    assert.ok(applies.some((u) => !isCurrency(u)));
  });
});
