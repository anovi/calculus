import { describe, expect, it } from 'vitest';

import { selectionAfterFunctionInsert } from './function-args-completion';

describe('selectionAfterFunctionInsert', () => {
  it('places the caret inside parens for functions with arguments', () => {
    const insert = 'sqrt()';
    const from = 0;
    expect(selectionAfterFunctionInsert(from, insert.length, 1)).toBe(
      from + insert.length - 1,
    );
  });

  it('places the caret after the closing paren for zero-arity functions', () => {
    const insert = 'sum()';
    const from = 0;
    expect(selectionAfterFunctionInsert(from, insert.length, 0)).toBe(
      from + insert.length,
    );
  });
});
