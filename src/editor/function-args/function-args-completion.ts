import type { Completion } from '@codemirror/autocomplete';
import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

import { planFunctionArgAdvance } from './function-args-advance';

/** Caret position after autocompleting `name()` at `from`. */
export function selectionAfterFunctionInsert(
  from: number,
  insertLength: number,
  arity: number,
): number {
  return arity === 0 ? from + insertLength : from + insertLength - 1;
}

/** Completion apply that advances to the next unfilled function argument when applicable. */
export function completionApplyWithArgAdvance(
  insert: string,
): NonNullable<Completion['apply']> {
  return (view: EditorView, _completion, from, to) => {
    const plan = planFunctionArgAdvance(view.state, from, to, insert);
    if (plan != null) {
      view.dispatch({
        changes: { from, to, insert: plan.insert },
        selection: EditorSelection.cursor(plan.selection),
      });
      return;
    }
    view.dispatch({
      changes: { from, to, insert },
      selection: EditorSelection.cursor(from + insert.length),
    });
  };
}
