import { EditorView } from "codemirror"
import browser from "../lib/browser"

/**
 * Workaround for
 * iOS Safari: tap after inline widget places caret at wrong document position
 *
 * A tap produces touchstart (CodeMirror sets `inputState.lastTouchTime`) and
 * then a synthetic mousedown. CodeMirror's mousedown handler finishes when
 * `lastTouchTime` is within the last 2s so it does not handle the same gesture
 * twice. Clearing `lastTouchTime` on mousedown makes the synthetic
 * event look like a normal mouse click.
 */
export const hackSafariTouchSelection = EditorView.domEventObservers({
  mousedown(_event, view) {
    if (browser.safari && browser.ios) {
      // @ts-expect-error — `inputState` is internal to @codemirror/view
      view.inputState.lastTouchTime = 0
    }
  },
})
