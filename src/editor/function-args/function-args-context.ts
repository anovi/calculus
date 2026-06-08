import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { SyntaxNode, NodeIterator } from '@lezer/common';

import { BUILTIN_FUNCTION_BY_NAME, getFunctionArgLabels, type FunctionArgLabel } from '../../calculator';
import { terms } from '../../language';

export type ArgExpressionSpan = { from: number; to: number };

export type FunctionCallContext = {
  fnName: string;
  fnDoc?: string;
  argIndex: number;
  anchorPos: number;
  args: FunctionArgLabel[];
  oprFrom: number;
  arity: number;
  expressions: readonly SyntaxNode[];
};

const expressionTermIds = new Set<number>([
  terms.AddExpression,
  terms.MulExpression,
  terms.ExpExpression,
  terms.ConvertExpression,
  terms.FunctionCall,
  terms.Literal,
  terms.Identifier,
]);

function collectArgExpressions(argList: SyntaxNode): SyntaxNode[] {
  const expressions: SyntaxNode[] = [];
  for (let child = argList.firstChild; child; child = child.nextSibling) {
    if (expressionTermIds.has(child.type.id)) {
      expressions.push(child);
    }
  }
  return expressions;
}

function functionCallBounds(node: SyntaxNode): { oprFrom: number; cprFrom: number; nameNode: SyntaxNode | null } | null {
  let oprFrom = -1;
  let cprFrom = -1;
  let nameNode: SyntaxNode | null = null;
  for (let child = node.firstChild; child; child = child.nextSibling) {
    if (child.type.id === terms.Identifier && nameNode == null) {
      nameNode = child;
    } else if (child.type.id === terms.Opr) {
      oprFrom = child.from;
    } else if (child.type.id === terms.Cpr) {
      cprFrom = child.from;
    }
  }
  if (oprFrom < 0 || cprFrom < 0 || nameNode == null) return null;
  return { oprFrom, cprFrom, nameNode };
}

export function argIndexAt(spans: readonly ArgExpressionSpan[], pos: number, doc: string): number {
  if (spans.length === 0) return 0;

  for (let i = 0; i < spans.length; i++) {
    const expr = spans[i];
    if (pos <= expr.from) return i;
    if (pos <= expr.to) return i;
    const next = spans[i + 1];
    if (next && pos > expr.to && pos < next.from) return i + 1;
  }

  const last = spans.length - 1;
  const lastExpr = spans[last];
  if (pos > lastExpr.to) {
    const prevChar = doc.slice(Math.max(lastExpr.to, pos - 1), pos);
    if (prevChar === ',' || (spans.length === 1 && pos > spans[0].to)) {
      return spans.length;
    }
  }
  return last;
}

function anchorPosFor(expressions: SyntaxNode[], argIndex: number, cursorPos: number): number {
  const expr = expressions[argIndex];
  if (expr && cursorPos >= expr.from && cursorPos < expr.to) {
    return Math.floor((expr.from + expr.to) / 2);
  }
  return cursorPos;
}

/** Innermost builtin function call whose argument list contains `pos`, or null. */
export function functionCallContextAt(state: EditorState, pos: number): FunctionCallContext | null {
  const tree = syntaxTree(state);
  let cur: NodeIterator | null = tree.resolveStack(pos, 1);
  while (cur) {
    const node = cur.node;
    if (node.type.id === terms.FunctionCall) {
      const bounds = functionCallBounds(node);
      if (bounds != null) {
        const { oprFrom, cprFrom, nameNode } = bounds;
        if (pos > oprFrom && pos <= cprFrom && nameNode != null) {
          const fnName = state.sliceDoc(nameNode.from, nameNode.to);
          const def = BUILTIN_FUNCTION_BY_NAME.get(fnName);
          if (!def) break;
          const argList = node.getChild(terms.ArgList);
          const expressions = argList ? collectArgExpressions(argList) : [];
          if (expressions.length >= def.arity) break;
          const doc = state.doc.toString();
          const argIndex = argIndexAt(expressions, pos, doc);

          return {
            fnName,
            fnDoc: def.doc,
            argIndex: Math.min(argIndex, def.arity - 1),
            anchorPos: anchorPosFor(expressions, argIndex, pos),
            args: getFunctionArgLabels(fnName, def.arity),
            oprFrom,
            arity: def.arity,
            expressions,
          };
        }
      }
    }
    cur = cur.next;
  }
  return null;
}
