import type { Range } from '@codemirror/state'
import {
  Decoration,
  gutter,
  GutterMarker,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from '@codemirror/view'
import { CalcValue } from '../calculator'
import { formatResult } from './calc-result-format'
import { calcRangesField, getCalcRanges } from './values-field'
import { parsePairKey, ratesStore } from '../rates-store'
import { CurrencyRateUpdated } from './effects'

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
    const a = this.value;
    const b = other.value;
    if (a.error !== b.error || a.name !== b.name || a.unit !== b.unit) return false;
    if (a.error != null) return true;
    return a.result != null && b.result != null && a.result.eq(b.result);
  }

  toDOM(view: EditorView): HTMLElement {
    // Two-element layout: the outer span has no visible style and sits flush
    // against the line's last character so the caret (which CodeMirror draws
    // at the widget's outer-left edge for `side: 1`) lands on the real text
    // boundary. The visible pill is an inner element, separated from the text
    // by transparent padding on the outer.
    const wrap = document.createElement('span');
    wrap.className = 'cm-calc-result';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.addEventListener('touchend', (e) => {
      e.preventDefault();
      console.log(e);
      this.#focusLine(view);
    });
    wrap.addEventListener('click', (e) => {
      e.preventDefault();
      console.log(e);
      this.#focusLine(view);
    });

    const pill = document.createElement('span');
    if (this.value.error != null) {
      pill.className = 'cm-calc-result__pill cm-calc-result__pill--error';
      pill.textContent = '= Error';
      pill.title = this.value.error;
    } else {
      pill.className = 'cm-calc-result__pill';
      pill.textContent = `= ${formatResult(this.value)}`;
    }
    wrap.appendChild(pill);

    return wrap;
  }

  
  ignoreEvent(): boolean {
    return true;
  }

  #focusLine(view: EditorView) {
    const values = view.state.field(calcRangesField);
    const cur = values.ranges.iter();
    while (cur.value) {
      if (cur.value === this.value) {
        view.dispatch({
          selection: { anchor: cur.to - 1 }
        });
        if (!view.hasFocus) view.focus();
        break;
      }
      cur.next();
    }
  }
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
    if (!cursor.value.error)
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
 * changes (i.e., the calculator recomputed). Reference equality on the field's
 * value avoids unnecessary work when only the selection or viewport moved.
 */
export const calcResultsPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    subscriptions: (() => void)[] = [];

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view);
    }

    update(update: ViewUpdate): void {
      const before = update.startState.field(calcRangesField);
      const after = update.state.field(calcRangesField);
      if (this.subscriptions.length > 0) this.subscriptions.forEach(sub => sub());
      this.subscriptions = after.awaitedRates
        .map((pairKey) => {
          return this.subscribeToCurrencyRateUpdate(pairKey, update.view)
        })
        .filter((v) => v != null);
      if (before !== after) {
        this.decorations = buildDecorations(update.view);
      }
    }

    private subscribeToCurrencyRateUpdate(pairKey: string, view: EditorView) {
      const pair = parsePairKey(pairKey);
      if (!pair) return;
      console.log('Subscribe to', pairKey);
      return ratesStore.subscribe(pair.from, pair.to, (state) => {
        if (!state.entry) return;
        view.dispatch({ effects: CurrencyRateUpdated.of(null) })
      });
    }
  },
  {
    decorations: (v) => v.decorations,
  },
)

const emptyMarker = new class extends GutterMarker {
  toDOM() { return document.createTextNode("1000000") }
}

class ValueMarker extends GutterMarker {
  public value: CalcValue;
  constructor(
    value: CalcValue
  ) {
    super();
    this.value = value;
  }
  toDOM() {
    if (this.value.error != null) {
      return document.createTextNode('Error');
    }
    return document.createTextNode(formatResult(this.value));
  }
}

export const emptyLineGutter = gutter({
  lineMarker(view, line) {
    const values = view.state.field(calcRangesField)
    // const cur = value.ranges.iter();
    // while (cur.value) {
    //   cur.next();
    // }
    let value: CalcValue|undefined = undefined;
    values.ranges.between(line.from, line.to, (from, _to, val) => {
      // console.log(line.from, line.to, val.result.toNumber())
      // console.log('value', from, to)
      if (line.from === from) value = val;
    });
    console.log(value)
    return value ? new ValueMarker(value) : null
  },
  initialSpacer: () => emptyMarker,
  side: 'after',
})