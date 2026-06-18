import { LRLanguage } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { describe, expect, it } from 'vitest';

import { parser } from '../../language';
import { planFunctionArgAdvance } from './function-args-advance';

const calcLanguage = LRLanguage.define({ name: 'compio', parser });

function planAt(doc: string, from: number, to: number, insert: string) {
  const state = EditorState.create({ doc, extensions: [calcLanguage] });
  return planFunctionArgAdvance(state, from, to, insert);
}

describe('planFunctionArgAdvance', () => {
  it('appends comma and moves to the next arg when more args are unfilled', () => {
    const doc = 'root()';
    const from = doc.indexOf('(') + 1;
    const plan = planAt(doc, from, from, '27');
    expect(plan).not.toBeNull();
    expect(plan!.insert).toBe('27, ');
    expect(plan!.selection).toBe(doc.indexOf('(') + 1 + '27, '.length);
  });

  it('does not advance when the last arg is accepted', () => {
    const doc = 'root(27, )';
    const from = doc.indexOf(',') + 2;
    const plan = planAt(doc, from, from, '3');
    expect(plan).not.toBeNull();
    expect(plan!.insert).toBe('3');
    expect(plan!.selection).toBe(from + '3'.length);
  });

  it('does not advance when a later arg is already filled', () => {
    const doc = 'root(, 3)';
    const from = doc.indexOf('(') + 1;
    const plan = planAt(doc, from, from, '27');
    expect(plan).not.toBeNull();
    expect(plan!.insert).toBe('27');
    expect(plan!.selection).toBe(from + '27'.length);
  });

  it('jumps to an existing trailing comma when editing an earlier arg', () => {
    const doc = 'root(27, )';
    const from = doc.indexOf('27');
    const to = from + '27'.length;
    const plan = planAt(doc, from, to, '28');
    expect(plan).not.toBeNull();
    expect(plan!.insert).toBe('28');
    expect(plan!.selection).toBe(doc.indexOf(',') + 2);
  });

  it('returns null outside an unfilled builtin call', () => {
    const doc = 'sqrt(16)';
    const from = doc.indexOf('16');
    const to = from + '16'.length;
    expect(planAt(doc, from, to, '25')).toBeNull();
  });

  it('does not advance for a single-arg function', () => {
    const doc = 'sqrt()';
    const from = doc.indexOf('(') + 1;
    const plan = planAt(doc, from, from, '16');
    expect(plan).not.toBeNull();
    expect(plan!.insert).toBe('16');
    expect(plan!.selection).toBe(from + '16'.length);
  });
});
