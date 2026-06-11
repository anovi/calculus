import { LRLanguage } from '@codemirror/language';
import { EditorState } from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';
import { describe, expect, it } from 'vitest';

import { parser } from '../../language';
import {
  buildAggregationInsert,
  insertPosForAggregation,
} from './statement-group-end';

const calcLanguage = LRLanguage.define({ name: 'calculus', parser });

function stateAt(doc: string, pos: number) {
  const state = EditorState.create({ doc, extensions: [calcLanguage] });
  syntaxTree(state);
  return { state, pos };
}

describe('insertPosForAggregation', () => {
  it('returns 0 for an empty document', () => {
    const { state, pos } = stateAt('', 0);
    expect(insertPosForAggregation(state, pos)).toBe(0);
  });

  it('returns group end when cursor is inside a multi-line group', () => {
    const doc = '10\n20';
    const { state, pos } = stateAt(doc, doc.indexOf('1'));
    expect(insertPosForAggregation(state, pos)).toBe(doc.length);
  });

  it('returns group end after existing aggregation in the same group', () => {
    const doc = '10\n20\nsum()';
    const { state, pos } = stateAt(doc, doc.indexOf('1'));
    expect(insertPosForAggregation(state, pos)).toBe(doc.length);
  });

  it('uses the current group when groups are separated by blank lines', () => {
    const doc = '10\n\n20';
    const { state, pos } = stateAt(doc, doc.indexOf('20'));
    expect(insertPosForAggregation(state, pos)).toBe(doc.length);
  });

  it('uses the preceding group when cursor is on a blank line', () => {
    const doc = '10\n\n20';
    const blankPos = doc.indexOf('\n\n') + 1;
    const { state, pos } = stateAt(doc, blankPos);
    expect(insertPosForAggregation(state, pos)).toBe('10'.length);
  });
});

describe('buildAggregationInsert', () => {
  it('inserts on a new line at the end of the current group', () => {
    const doc = '10\n20';
    const { state, pos } = stateAt(doc, doc.indexOf('1'));
    const plan = buildAggregationInsert(state, 'sum', pos);
    expect(plan).toEqual({
      from: doc.length,
      to: doc.length,
      insert: '\nsum()',
      selection: doc.length + '\nsum()'.length,
    });
  });

  it('inserts without a leading newline at the start of an empty document', () => {
    const { state, pos } = stateAt('', 0);
    const plan = buildAggregationInsert(state, 'sum', pos);
    expect(plan).toEqual({
      from: 0,
      to: 0,
      insert: 'sum()',
      selection: 'sum()'.length,
    });
  });

  it('appends after a single-line group without an extra blank line', () => {
    const doc = '10';
    const { state, pos } = stateAt(doc, doc.indexOf('0'));
    const plan = buildAggregationInsert(state, 'average', pos);
    expect(plan.insert).toBe('\naverage()');
    expect(plan.selection).toBe(doc.length + plan.insert.length);
  });
});
