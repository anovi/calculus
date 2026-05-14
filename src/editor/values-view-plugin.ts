import type { Range } from '@codemirror/state'
import {
  Decoration,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from '@codemirror/view'
import type Decimal from 'decimal.js'

import { CalcValue } from '../composer'
import { calcRangesField, getCalcRanges } from './values-field'

/**
 * Inline widget rendering a calculation result next to its source range.
 *
 * Equality is based on the displayed value (and binding name, when present),
 * so the underlying DOM node is reused across transactions whenever the
 * result is unchanged.
 */
class ResultWidget extends WidgetType {
  readonly value: CalcValue

  constructor(value: CalcValue) {
    super();
    this.value = value;
  }

  eq(other: ResultWidget): boolean {
    return (
      other.value.result.eq(this.value.result) &&
      other.value.name === this.value.name &&
      other.value.unit === this.value.unit
    );
  }

  toDOM(): HTMLElement {
    // Two-element layout: the outer span has no visible style and sits flush
    // against the line's last character so the caret (which CodeMirror draws
    // at the widget's outer-left edge for `side: 1`) lands on the real text
    // boundary. The visible pill is an inner element, separated from the text
    // by transparent padding on the outer.
    const wrap = document.createElement('span');
    wrap.className = 'cm-calc-result';
    wrap.setAttribute('aria-hidden', 'true');

    const pill = document.createElement('span');
    pill.className = 'cm-calc-result__pill';
    const unitSuffix = this.value.unit ? ` ${this.value.unit}` : '';
    pill.textContent = `= ${formatResult(this.value.result)}${unitSuffix}`;
    wrap.appendChild(pill);

    return wrap;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function formatResult(n: Decimal): string {
  if (!n.isFinite()) return n.toString();
  if (n.isInteger()) return n.toString();
  return n.toDecimalPlaces(6).toString();
}

/**
 * Walks the current `calcRangesField` and emits a widget decoration anchored
 * at the end of the line each value occupies. The grammar's `lineEnd` token
 * is part of the value's range, so we anchor at `doc.lineAt(from).to` to land
 * BEFORE the trailing newline (or at EOF for the last row).
 */
function buildDecorations(view: EditorView): DecorationSet {
  const set = getCalcRanges(view.state);
  if (set.size === 0) return Decoration.none;

  const widgets: Range<Decoration>[] = []
  const doc = view.state.doc;
  const cursor = set.iter();
  while (cursor.value !== null) {
    const lineEnd = doc.lineAt(cursor.from).to;
    widgets.push(
      Decoration.widget({
        widget: new ResultWidget(cursor.value),
        side: 1,
      }).range(lineEnd),
    )
    cursor.next();
  }
  return Decoration.set(widgets, true);
}

/**
 * View plugin that mirrors `calcRangesField` as a `DecorationSet`.
 *
 * Decorations live on the view (not in state) because they're a pure
 * presentation concern; we just rebuild them whenever the field's reference
 * changes (i.e., the composer recomputed). Reference equality on the field's
 * value avoids unnecessary work when only the selection or viewport moved.
 */
export const calcResultsPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate): void {
      const before = update.startState.field(calcRangesField);
      const after = update.state.field(calcRangesField);
      if (before !== after) {
        this.decorations = buildDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
)
