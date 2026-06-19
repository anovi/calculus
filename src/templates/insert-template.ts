import { EditorSelection } from '@codemirror/state';
import type { EditorView } from '@codemirror/view';
import { isMobileDevice } from '../lib/mobile-device';

/** Replace the full document with a template (single undo step). */
export function insertTemplate(view: EditorView, content: string): void {
  const { doc } = view.state;
  const isMobile = isMobileDevice();
  view.dispatch({
    changes: { from: 0, to: doc.length, insert: content },
    selection: isMobile ? undefined : EditorSelection.cursor(content.length),
  });
  if (!isMobile) view.focus();
}
