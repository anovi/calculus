import {
    EditorView,
    type KeyBinding
} from "@codemirror/view"
import { EditorState } from "@codemirror/state"
import {
    foldable, foldState,
    foldEffect,
    unfoldEffect
} from "@codemirror/language"



function announceFold(view: EditorView, range: {from: number, to: number}, fold = true) {
  let lineFrom = view.state.doc.lineAt(range.from).number, lineTo = view.state.doc.lineAt(range.to).number
  return EditorView.announce.of(
    `${view.state.phrase(fold ? "Folded lines" : "Unfolded lines")} ${lineFrom} ${view.state.phrase("to")} ${lineTo}.`
  )
}

function getLinesWithSelection(state: EditorState) {
  let ranges: { from: number, to: number }[] = [];

  for (let r of state.selection.ranges) {
    let start = state.doc.lineAt(r.from);

    // selection end is exclusive
    let endPos = r.empty ? r.to : Math.max(r.from, r.to - 1);
    let end = state.doc.lineAt(endPos);

    for (let n = start.number; n <= end.number; n++) {
      const line = state.doc.line(n)

      ranges.push({
        from: line.from,
        to: line.to
      })
    }
  }

  return ranges
}

function findFold(state: EditorState, from: number, to: number) {
  let found: {from: number, to: number} | null = null
  state.field(foldState, false)?.between(from, to, (from, to) => {
    if (!found || found.from > from) found = {from, to}
  })
  return found
}

const Mode = {
  undecided: 0,
  folding: 1,
  unfolding: 2
} as const;

/** Fold the lines that are selected, if possible. */
export const toggleLinesCodeFolding = (view: EditorView, lines: {from: number, to: number}[]) => {
  let effects = []
  let mode: typeof Mode[keyof typeof Mode] = Mode.undecided;

  for (let line of lines) {
    if (mode !== Mode.folding) {
      let folded = findFold(view.state, line.from, line.to)
      if (folded) {
        effects.push(unfoldEffect.of(folded), announceFold(view, folded, false));
        mode = Mode.unfolding;
      }
    }

    if (mode === Mode.unfolding) continue;

    let range = foldable(view.state, line.from, line.to)
    if (range) {
      effects.push(foldEffect.of(range), announceFold(view, range));
      mode = Mode.folding;
    }
  }
  if (effects.length) {
    view.dispatch({ effects });
    return true;
  }
  return false;
}

export const foldKeymap: readonly KeyBinding[] = [
  { key: "Ctrl-.",     mac: "Cmd-.",     run: (view) => toggleLinesCodeFolding(view, getLinesWithSelection(view.state)) },
  { key: "Ctrl-Alt-.", mac: "Cmd-Alt-.", run: (view) => toggleLinesCodeFolding(view, view.viewportLineBlocks) },
  { key: "Ctrl-Alt-.", mac: "Cmd-Alt-.", run: (view) => toggleLinesCodeFolding(view, view.viewportLineBlocks) }
]