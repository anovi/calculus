import { EditorState, RangeSet, StateField, type Extension } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

import { CalcValue, MathCalculator } from '../calculator'
import { ratesStore } from '../rates-store'
import { CurrencyRateUpdated } from './effects'

/**
 * Builds a `RangeSet<CalcValue>` for the current editor state by running
 * `MathCalculator` over the freshly parsed syntax tree.
 */
function computeRanges(state: EditorState): FieldValue {
  const tree = syntaxTree(state)
  const calculator = new MathCalculator(
    (from, to) => state.sliceDoc(from, to),
    ratesStore,
    state.doc,
  )
  const ranges = calculator.assemble(tree.cursor()) ?? []

  if (ranges.length === 0) return {
    ranges: RangeSet.empty,
    awaitedRates: [],
  };

  return {
    ranges: RangeSet.of(ranges, true),
    awaitedRates: calculator.ratesAwaited
  }
}

type FieldValue = {
  ranges: RangeSet<CalcValue>;
  awaitedRates: string[];
}

/**
 * A `StateField` holding the latest `RangeSet` produced by `MathCalculator`.
 *
 * The set is recomputed whenever the document changes or the (potentially
 * asynchronously parsed) syntax tree advances. Otherwise the previous value
 * is preserved so consumers can rely on reference equality.
 */
export const calcRangesField: StateField<FieldValue> = StateField.define<FieldValue>({
  create(state) {
    return computeRanges(state);
  },

  update(value, tr) {
    if (
      tr.docChanged ||
      tr.effects.find(fx => fx.is(CurrencyRateUpdated)) ||
      syntaxTree(tr.state) !== syntaxTree(tr.startState)
    ) {
      return computeRanges(tr.state);
    }
    return value
  },

})

/** Convenience accessor for the current `RangeSet` in a given state. */
export function getCalcRanges(state: EditorState): RangeSet<CalcValue> {
  return state.field(calcRangesField).ranges;
}

/** Calc value whose result pill is anchored at `pos` (line end), if any. */
export function calcValueAtAnchor(state: EditorState, pos: number): CalcValue | null {
  const ranges = getCalcRanges(state)
  let found: CalcValue | null = null
  const doc = state.doc
  ranges.between(0, doc.length, (from, _to, val) => {
    if (doc.lineAt(from).to === pos) found = val
  })
  return found
}

/** Editor extension that installs `calcRangesField`. */
export function calcRanges(): Extension {
  return calcRangesField
}
