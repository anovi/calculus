import type { EditorState } from '@codemirror/state';

import {
  argIndexAt,
  functionCallContextAt,
  type ArgExpressionSpan,
  type FunctionCallContext,
} from './function-args-context';

function adjustExprSpan(
  span: ArgExpressionSpan,
  from: number,
  to: number,
  insertLen: number,
): ArgExpressionSpan {
  const delta = insertLen - (to - from);
  if (span.to <= from) return span;
  if (span.from >= to) return { from: span.from + delta, to: span.to + delta };
  return { from, to: from + insertLen };
}

function filledArgIndices(
  spans: readonly ArgExpressionSpan[],
  doc: string,
): Set<number> {
  const filled = new Set<number>();
  for (const span of spans) {
    if (doc.slice(span.from, span.to).trim().length > 0) {
      filled.add(argIndexAt(spans, span.from, doc));
    }
  }
  return filled;
}

function nextUnfilledArgIndex(
  filled: Set<number>,
  afterIndex: number,
  arity: number,
): number | null {
  for (let i = afterIndex + 1; i < arity; i++) {
    if (!filled.has(i)) return i;
  }
  return null;
}

function cursorPosForUnfilledArg(
  doc: string,
  spans: readonly ArgExpressionSpan[],
  argIndex: number,
  oprFrom: number,
): number {
  for (const span of spans) {
    if (argIndexAt(spans, span.from, doc) === argIndex) {
      if (doc.slice(span.from, span.to).trim().length === 0) return span.from;
    }
  }

  if (argIndex === 0 && spans.length === 0) return oprFrom + 1;

  let after = oprFrom + 1;
  for (let i = 0; i < argIndex; i++) {
    for (const span of spans) {
      if (argIndexAt(spans, span.from, doc) === i) {
        after = Math.max(after, span.to);
      }
    }
  }

  let pos = after;
  while (pos < doc.length && /[\s,]/.test(doc[pos]!)) pos++;
  return pos;
}

function spansAfterReplace(
  ctx: FunctionCallContext,
  from: number,
  to: number,
  insertLen: number,
): ArgExpressionSpan[] {
  const adjusted = ctx.expressions.map((expr) =>
    adjustExprSpan({ from: expr.from, to: expr.to }, from, to, insertLen),
  );
  const replacedCurrentArg = adjusted.some(
    (span) => span.from <= from && to <= span.to,
  );
  if (replacedCurrentArg) return adjusted;
  return [...adjusted, { from, to: from + insertLen }].sort((a, b) => a.from - b.from);
}

/** After accepting a completion, optionally append `, ` and move to the next unfilled arg. */
export function planFunctionArgAdvance(
  state: EditorState,
  from: number,
  to: number,
  insert: string,
): { insert: string; selection: number } | null {
  const ctx = functionCallContextAt(state, from);
  if (ctx == null) return null;

  const doc = state.doc.toString();
  const endOfInsert = from + insert.length;
  let spans = spansAfterReplace(ctx, from, to, insert.length);
  let docAfter = doc.slice(0, from) + insert + doc.slice(to);

  const filled = filledArgIndices(spans, docAfter);
  filled.add(ctx.argIndex);

  const next = nextUnfilledArgIndex(filled, ctx.argIndex, ctx.arity);
  if (next == null) {
    return { insert, selection: endOfInsert };
  }

  const cursorBeforeComma = cursorPosForUnfilledArg(docAfter, spans, next, ctx.oprFrom);
  if (!docAfter.slice(endOfInsert, cursorBeforeComma).includes(',')) {
    const suffix = ', ';
    const fullInsert = insert + suffix;
    docAfter = doc.slice(0, from) + fullInsert + doc.slice(to);
    const suffixDelta = suffix.length;
    spans = spans.map((span) =>
      span.from >= endOfInsert
        ? { from: span.from + suffixDelta, to: span.to + suffixDelta }
        : span,
    );
    return {
      insert: fullInsert,
      selection: cursorPosForUnfilledArg(docAfter, spans, next, ctx.oprFrom),
    };
  }

  return { insert, selection: cursorBeforeComma };
}
