import assert from 'node:assert';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { EditorSelection, EditorState, Transaction } from '@codemirror/state';
import { LRLanguage } from '@codemirror/language';

import { parser } from '../../language';
import { formatOnType } from './format-on-type';

const MOBILE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';

const calcLanguage = LRLanguage.define({ name: 'calculus', parser });

function typeTransaction(state: EditorState, pos: number, text: string): Transaction {
  return state.update({
    changes: { from: pos, insert: text },
    selection: EditorSelection.cursor(pos + text.length),
    annotations: Transaction.userEvent.of('input.type'),
  });
}

describe('formatOnType userEvent', () => {
  beforeEach(() => {
    vi.stubGlobal('navigator', { userAgent: MOBILE_UA });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('preserves input.type when no format changes apply', () => {
    const state = EditorState.create({
      doc: '100 us',
      extensions: [calcLanguage, formatOnType()],
    });
    const tr = typeTransaction(state, state.doc.length, 'd');
    assert.ok(tr.isUserEvent('input.type'));
  });

  it('preserves input.type when inserting spaces', () => {
    const state = EditorState.create({
      doc: '100USD',
      selection: EditorSelection.cursor(6),
      extensions: [calcLanguage, formatOnType()],
    });
    const tr = typeTransaction(state, 3, ' ');
    assert.ok(tr.isUserEvent('input.type'));
  });
});
