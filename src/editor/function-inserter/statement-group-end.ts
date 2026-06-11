import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { NodeIterator } from '@lezer/common';

import { terms } from '../../language';

function statementGroupAt(state: EditorState, pos: number): number | null {
  const tree = syntaxTree(state);
  let cur: NodeIterator | null = tree.resolveStack(pos, 1);
  while (cur) {
    if (cur.node.type.id === terms.StatementGroup) return cur.node.to;
    cur = cur.next;
  }
  return null;
}

function precedingStatementGroupEnd(state: EditorState, pos: number): number | null {
  const tree = syntaxTree(state);
  let best: number | null = null;
  tree.iterate({
    enter(node) {
      if (node.type.id === terms.StatementGroup && node.to <= pos) {
        if (best === null || node.to > best) best = node.to;
      }
    },
  });
  return best;
}

function trimTrailingLineEnds(doc: string, insertPos: number): number {
  let end = insertPos;
  while (end > 0 && doc[end - 1] === '\n') end--;
  return end;
}

/** Document offset where an aggregation call should be inserted. */
export function insertPosForAggregation(state: EditorState, pos: number): number {
  const doc = state.doc.toString();
  const groupEnd =
    statementGroupAt(state, pos) ?? precedingStatementGroupEnd(state, pos) ?? 0;
  return trimTrailingLineEnds(doc, groupEnd);
}

export type AggregationInsertPlan = {
  from: number;
  to: number;
  insert: string;
  selection: number;
};

/** Build insert text and caret position for a zero-arity aggregation function. */
export function buildAggregationInsert(
  state: EditorState,
  fnName: string,
  pos: number,
): AggregationInsertPlan {
  const insertPos = insertPosForAggregation(state, pos);
  const doc = state.doc.toString();
  const needsNewline = insertPos > 0 && doc[insertPos - 1] !== '\n';
  const fnInsert = `${fnName}()`;
  const insert = needsNewline ? `\n${fnInsert}` : fnInsert;
  return {
    from: insertPos,
    to: insertPos,
    insert,
    selection: insertPos + insert.length,
  };
}
