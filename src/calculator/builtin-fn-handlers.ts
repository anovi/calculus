import Decimal from 'decimal.js';
import type { TreeCursor } from '@lezer/common';

import { BUILTIN_FUNCTIONS } from './builtin-fn-registry';
import type { ExpressionResult, ExpressionResultError } from './types';

export type BuiltinHandler = (args: ExpressionResult[]) => ExpressionResult | null;

export type GroupAggregationDeps = {
  cursor: TreeCursor;
  combineAdd: (...args: ExpressionResult[]) => ExpressionResult;
  normalizeArgs: (args: ExpressionResult[]) => ExpressionResult[];
  expressionError: (message: string) => ExpressionResultError;
};

export type GroupAggregationHandler = (
  args: ExpressionResult[],
  deps: GroupAggregationDeps,
) => ExpressionResult;

function unary(method: (n: Decimal) => Decimal): BuiltinHandler {
  return (args) => {
    if (args.length !== 1) return null;
    return { n: method(args[0].n), unit: args[0].unit };
  };
}

function binary(method: (a: Decimal, b: Decimal) => Decimal): BuiltinHandler {
  return (args) => {
    if (args.length !== 2) return null;
    return { n: method(args[0].n, args[1].n), unit: args[0].unit };
  };
}

function ternary(method: (a: Decimal, b: Decimal, c: Decimal) => Decimal): BuiltinHandler {
  return (args) => {
    if (args.length !== 3) return null;
    return { n: method(args[0].n, args[1].n, args[2].n), unit: args[0].unit };
  };
}

// Not wrapped
function stripUnit(args: ExpressionResult[]): ExpressionResult | null {
  if (args.length !== 1) return null;
  return { n: args[0].n };
}

/**
 * n-th root of x (degree n in `root(x, n)`). Differs from `^`: odd integer roots
 * of negative bases are real; `(-8)^(1/3)` still uses Decimal.pow and yields NaN.
 */
function nthRoot(x: Decimal, n: Decimal): Decimal {
  if (n.isZero()) return new Decimal(NaN);
  const inv = new Decimal(1).div(n);
  if (x.gte(0)) return x.pow(inv);
  if (n.isInteger() && n.gt(0) && n.mod(2).eq(1)) {
    return x.abs().pow(inv).negated();
  }
  return x.pow(inv);
}

function groupSum(args: ExpressionResult[], deps: GroupAggregationDeps): ExpressionResult {
  if (args.length === 0) return { n: new Decimal(0) };
  return deps.combineAdd(...args);
}

function groupAverage(args: ExpressionResult[], deps: GroupAggregationDeps): ExpressionResult {
  if (args.length === 0) {
    return deps.expressionError('average() needs at least one preceding line');
  }
  const summed = deps.combineAdd(...args);
  if ('error' in summed && summed.error != null) return summed;
  return { n: summed.n.div(args.length), unit: summed.unit };
}

function groupMedian(args: ExpressionResult[], deps: GroupAggregationDeps): ExpressionResult {
  if (args.length === 0) {
    return deps.expressionError('median() needs at least one preceding line');
  }
  const normalized = deps.normalizeArgs(args);
  const operandError = normalized.find((a) => 'error' in a && a.error != null);
  if (operandError) return operandError;
  const unit = normalized.find((a) => a.unit)?.unit;
  const sorted = normalized.map((a) => a.n).sort((a, b) => a.cmp(b));
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1
      ? sorted[mid]
      : sorted[mid - 1].plus(sorted[mid]).div(2);
  return { n: median, unit };
}

export const groupAggregationHandlers = new Map<string, GroupAggregationHandler>([
  ['sum', groupSum],
  ['average', groupAverage],
  ['median', groupMedian],
]);

export const builtinHandlers = new Map<string, BuiltinHandler>([
  ['abs', unary((n) => n.abs())],
  ['ceil', unary((n) => n.ceil())],
  ['floor', unary((n) => n.floor())],
  ['round', unary((n) => n.round())],
  ['trunc', unary((n) => n.trunc())],
  ['num', stripUnit],
  ['sqrt', unary((n) => n.sqrt())],
  ['cbrt', unary((n) => n.cbrt())],
  ['root', binary(nthRoot)],
  ['sin', unary((n) => n.sin())],
  ['cos', unary((n) => n.cos())],
  ['tan', unary((n) => n.tan())],
  ['asin', unary((n) => n.asin())],
  ['acos', unary((n) => n.acos())],
  ['atan', unary((n) => n.atan())],
  ['sinh', unary((n) => n.sinh())],
  ['cosh', unary((n) => n.cosh())],
  ['tanh', unary((n) => n.tanh())],
  ['asinh', unary((n) => n.asinh())],
  ['acosh', unary((n) => n.acosh())],
  ['atanh', unary((n) => n.atanh())],
  ['exp', unary((n) => n.exp())],
  ['ln', unary((n) => n.ln())],
  ['log10', unary((n) => n.log(10))],
  ['log2', unary((n) => n.log(2))],
  ['log', binary((n, base) => n.log(base))],
  ['pow', binary((base, exp) => base.pow(exp))],
  ['min', binary((a, b) => Decimal.min(a, b))],
  ['max', binary((a, b) => Decimal.max(a, b))],
  ['atan2', binary((y, x) => Decimal.atan2(y, x))],
  ['hypot', binary((x, y) => Decimal.hypot(x, y))],
  ['clamp', ternary((value, min, max) => value.clamp(min, max))],
  ['sum', () => null],
  ['total', () => null],
  ['average', () => null],
  ['avg', () => null],
  ['median', () => null],
]);

for (const def of BUILTIN_FUNCTIONS) {
  if (!builtinHandlers.has(def.name)) {
    throw new Error(`Missing builtin handler for ${def.name}`);
  }
  if (def.aggregatesGroup) {
    const canonical = def.name === 'total' ? 'sum' : def.name === 'avg' ? 'average' : def.name;
    if (!groupAggregationHandlers.has(canonical)) {
      throw new Error(`Missing group aggregation handler for ${def.name}`);
    }
  }
}
