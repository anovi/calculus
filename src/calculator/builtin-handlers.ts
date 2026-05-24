import Decimal from 'decimal.js';

import { BUILTIN_FUNCTIONS } from '../functions';
import type { ExpressionResult } from './types';

export type BuiltinHandler = (args: ExpressionResult[]) => ExpressionResult | null;

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

export function evalSqrt(args: ExpressionResult[]): ExpressionResult | null {
  if (args.length !== 1) return null;
  return { n: args[0].n.sqrt(), unit: args[0].unit };
}

export function evalRoot(args: ExpressionResult[]): ExpressionResult | null {
  if (args.length !== 2) return null;
  return { n: nthRoot(args[0].n, args[1].n), unit: args[0].unit };
}

export const builtinHandlers = new Map<string, BuiltinHandler>([
  ['sqrt', evalSqrt],
  ['root', evalRoot],
]);

for (const def of BUILTIN_FUNCTIONS) {
  if (!builtinHandlers.has(def.name)) {
    throw new Error(`Missing builtin handler for ${def.name}`);
  }
}
