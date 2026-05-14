import { EditorState, RangeSet, StateField, type Extension } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

import { CalcValue, MathComposer } from './composer'
import { ratesStore } from '../rates-store'

/**
 * Builds a `RangeSet<CalcValue>` for the current editor state by running
 * `MathComposer` over the freshly parsed syntax tree.
 */
function computeRanges(state: EditorState): RangeSet<CalcValue> {
  const tree = syntaxTree(state)
  const composer = new MathComposer((from, to) => state.sliceDoc(from, to), ratesStore)
  const ranges = composer.assemble(tree.cursor()) ?? []
  if (ranges.length === 0) return RangeSet.empty
  return RangeSet.of(ranges, true)
}

type FieldValue = {
  ranges: RangeSet<CalcValue>;
  composer: MathComposer;
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
    return {
      ranges: computeRanges(state),
      composer: new MathComposer((from, to) => state.sliceDoc(from, to), ratesStore)
    }
  },

  update(value, tr) {
    // const mapped = value.ranges.map(tr.changes);
    // tr.changes.touchesRange()
    value.composer.sliceDoc = (from, to) => tr.state.sliceDoc(from, to);
    if (tr.docChanged) return {
      ranges: computeRanges(tr.state),
      composer: value.composer,
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
