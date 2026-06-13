import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';

/** Replace the full document with a template (single undo step). */
export function insertTemplate(view: EditorView, content: string): void {
  const { doc } = view.state;
  view.dispatch({
    changes: { from: 0, to: doc.length, insert: content },
    selection: EditorSelection.cursor(content.length),
  });
  view.focus();
}
