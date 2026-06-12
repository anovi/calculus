import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

import type { BuiltinFunction } from '../../calculator';
import { functionCallContextAt } from '../function-args/function-args-context';
import { planFunctionArgAdvance } from '../function-args/function-args-advance';
import { selectionAfterFunctionInsert } from '../function-args/function-args-completion';

/** Insert a builtin function at the selection, matching autocompletion behavior. */
export function dispatchBuiltinFunctionInsert(
  view: EditorView,
  fnDef: BuiltinFunction,
  from: number,
  to: number,
): void {
  if (functionCallContextAt(view.state, from) != null) {
    const plan = planFunctionArgAdvance(view.state, from, to, fnDef.name);
    if (plan != null) {
      view.dispatch({
        changes: { from, to, insert: plan.insert },
        selection: EditorSelection.cursor(plan.selection),
      });
      view.focus();
      return;
    }
  }

  const insert = `${fnDef.name}()`;
  view.dispatch({
    changes: { from, to, insert },
    selection: EditorSelection.cursor(
      selectionAfterFunctionInsert(from, insert.length, fnDef.arity),
    ),
  });
  view.focus();
}

/** Insert using the editor's current selection. */
export function insertBuiltinFunction(view: EditorView, fnDef: BuiltinFunction): void {
  const { from, to } = view.state.selection.main;
  dispatchBuiltinFunctionInsert(view, fnDef, from, to);
}
