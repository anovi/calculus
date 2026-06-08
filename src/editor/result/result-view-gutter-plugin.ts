import {
  gutter,
  GutterMarker
} from '@codemirror/view'
import { CalcValue } from '../../calculator'
import { formatResult } from './result-format'
import { calcRangesField } from '../values-field'


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

/**
 * Render results in right gutter.
 * 
 * @deprecated Disabled. But kept here for possible future experiments.
*/
export const emptyLineGutter = gutter({
  lineMarker(view, line) {
    const values = view.state.field(calcRangesField)
    let value: CalcValue|undefined = undefined;
    values.ranges.between(line.from, line.to, (from, _to, val) => {
      if (line.from === from) value = val;
    });
    console.log(value)
    return value ? new ValueMarker(value) : null
  },
  initialSpacer: () => emptyMarker,
  side: 'after',
})
