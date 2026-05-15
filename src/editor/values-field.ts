import { EditorState, RangeSet, StateField, type Extension } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

import { CalcValue, MathComposer } from '../composer/composer'
import { parsePairKey, ratesStore } from '../rates-store'
import { CurrencyRateUpdated } from './effects'

/**
 * Builds a `RangeSet<CalcValue>` for the current editor state by running
 * `MathComposer` over the freshly parsed syntax tree.
 */
function computeRanges(state: EditorState): FieldValue {
  const tree = syntaxTree(state)
  const composer = new MathComposer((from, to) => state.sliceDoc(from, to), ratesStore)
  const ranges = composer.assemble(tree.cursor()) ?? []

  if (ranges.length === 0) return {
    ranges: RangeSet.empty,
    awaitedRates: [],
  };

  return {
    ranges: RangeSet.of(ranges, true),
    awaitedRates: composer.ratesAwaited
  }
}

type FieldValue = {
  ranges: RangeSet<CalcValue>;
  awaitedRates: string[];
}

/**
 * A `StateField` holding the latest `RangeSet` produced by `MathComposer`.
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
    if (tr.docChanged || tr.effects.find(fx => fx.is(CurrencyRateUpdated))) {
      return computeRanges(tr.state);
    }
    return value
  },

})

/** Convenience accessor for the current `RangeSet` in a given state. */
export function getCalcRanges(state: EditorState): RangeSet<CalcValue> {
  return state.field(calcRangesField).ranges;
}

/** Editor extension that installs `calcRangesField`. */
export function calcRanges(): Extension {
  return calcRangesField
}
