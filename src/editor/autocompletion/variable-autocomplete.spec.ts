import assert from 'node:assert';
import { EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { LRLanguage } from '@codemirror/language';
import { CompletionContext } from '@codemirror/autocomplete';

import { parser } from '../../language';
import { BUILTIN_FUNCTIONS } from '../../calculator';
import { calcRanges } from '../values-field';
import { variableCompletionSource } from './variable-autocomplete';

const calcLanguage = LRLanguage.define({
  name: 'calculus',
  parser,
});

async function completionAt(doc: string, pos: number, explicit = true) {
  const state = EditorState.create({
    doc,
    extensions: [calcLanguage, calcRanges()],
  });
  syntaxTree(state);
  return Promise.resolve(
    variableCompletionSource(new CompletionContext(state, pos, explicit)),
  );
}

describe('variableCompletionSource', () => {
  it('returns null when editing a binding identifier', async () => {
    const doc = 'rate = 5';
    assert.strictEqual(await completionAt(doc, doc.indexOf('rate') + 'rate'.length), null);
    assert.strictEqual(await completionAt(doc, doc.indexOf('rate') + 2), null);
  });

  it('returns null outside identifier contexts', async () => {
    assert.strictEqual(await completionAt('100 + 2', 3), null);
    assert.strictEqual(await completionAt('rate = 5', 'rate = '.length), null);
  });

  it('returns null for an empty identifier unless completion is explicit', async () => {
    const doc = 'a = 1\n';
    assert.strictEqual(await completionAt(doc, doc.length, false), null);
  });

  it('returns options for a variable reference', async () => {
    const doc = 'a = 1\na';
    const pos = doc.length;
    const result = await completionAt(doc, pos);
    assert.ok(result);
    assert.strictEqual(result.from, doc.lastIndexOf('a'));
    assert.strictEqual(result.to, pos);
    assert.ok(result.options.some((option) => option.label === 'a' && option.type === 'variable'));
    assert.ok(result.options.some((option) => option.label === 'sqrt' && option.type === 'function'));
  });

  it('includes all builtin functions in general identifier completion', async () => {
    const doc = 'a = 1\na';
    const pos = doc.length;
    const result = await completionAt(doc, pos);
    assert.ok(result);
    for (const fn of BUILTIN_FUNCTIONS) {
      assert.ok(result.options.some((option) => option.label === fn.name));
    }
  });

  it('returns function-only options when editing a function name in a call', async () => {
    const doc = 'sqrt(2)';
    const pos = doc.indexOf('sqrt') + 2;
    const result = await completionAt(doc, pos);
    assert.ok(result);
    assert.ok(result.options.every((option) => option.type === 'function'));
    assert.ok(!result.options.some((option) => option.type === 'variable'));
  });
});
