import { LRLanguage } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';

import { parser } from '../../language';
import { functionCallContextAt } from './function-args-context';

const calcLanguage = LRLanguage.define({ name: 'compio', parser });

function contextAt(doc: string, pos: number) {
  const state = EditorState.create({ doc, extensions: [calcLanguage] });
  return functionCallContextAt(state, pos);
}

describe('functionCallContextAt', () => {
  it('returns sqrt context for empty call', () => {
    const doc = 'sqrt()';
    const pos = doc.indexOf('(') + 1;
    const ctx = contextAt(doc, pos);
    expect(ctx).not.toBeNull();
    expect(ctx!.fnName).toBe('sqrt');
    expect(ctx!.argIndex).toBe(0);
  });

  it('returns null when arg list is filled', () => {
    const doc = 'sqrt(16)';
    const pos = doc.indexOf('16') + 1;
    expect(contextAt(doc, pos)).toBeNull();
  });

  it('returns root context while second arg is missing', () => {
    const doc = 'root(27, )';
    const pos = doc.indexOf(',') + 1;
    const ctx = contextAt(doc, pos);
    expect(ctx).not.toBeNull();
    expect(ctx!.fnName).toBe('root');
    expect(ctx!.argIndex).toBe(1);
  });

  it('returns null when root arg list is filled', () => {
    const doc = 'root(27, 3)';
    expect(contextAt(doc, doc.indexOf('3'))).toBeNull();
    expect(contextAt(doc, doc.indexOf(',') + 1)).toBeNull();
  });

  it('returns innermost unfilled builtin call for nested calls', () => {
    const doc = 'sqrt(root(8, ))';
    const pos = doc.indexOf('8');
    const ctx = contextAt(doc, pos);
    expect(ctx).not.toBeNull();
    expect(ctx!.fnName).toBe('root');
    expect(ctx!.argIndex).toBe(0);
  });

  it('returns null for nested call when inner list is filled', () => {
    const doc = 'sqrt(root(8, 3))';
    expect(contextAt(doc, doc.indexOf('8'))).toBeNull();
  });

  it('returns null for non-builtin calls', () => {
    const doc = 'foo(1, )';
    expect(contextAt(doc, doc.indexOf(',') + 1)).toBeNull();
  });

  it('returns null outside call parentheses', () => {
    const doc = 'sqrt(16)';
    const pos = doc.indexOf('sqrt') + 2;
    expect(contextAt(doc, pos)).toBeNull();
  });
});
