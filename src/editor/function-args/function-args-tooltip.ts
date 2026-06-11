import { StateField, type EditorState, type Extension } from '@codemirror/state';
import { showTooltip, type Tooltip } from '@codemirror/view';

import { functionCallContextAt } from './function-args-context';
import { buildFunctionArgsTooltipDom } from './function-args-tooltip-dom';

function tooltipsAt(state: EditorState): readonly Tooltip[] {
  const tooltips: Tooltip[] = [];
  for (const range of state.selection.ranges) {
    if (!range.empty) continue;
    const ctx = functionCallContextAt(state, range.head);
    if (ctx == null) continue;
    tooltips.push({
      pos: ctx.anchorPos,
      above: true,
      arrow: true,
      create: () => ({ dom: buildFunctionArgsTooltipDom(ctx) }),
    });
  }
  return tooltips;
}

const functionArgsTooltipField = StateField.define<readonly Tooltip[]>({
  create: (state) => tooltipsAt(state),
  update(tooltips, tr) {
    if (!tr.docChanged && !tr.selection) return tooltips;
    return tooltipsAt(tr.state);
  },
  provide: (f) => showTooltip.computeN([f], (state) => state.field(f)),
});

/** Cursor tooltip showing function argument help inside call parentheses. */
export function functionArgsTooltip(): Extension {
  return functionArgsTooltipField;
}
