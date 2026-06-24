import { type Extension } from '@codemirror/state';
import {
  ViewPlugin,
  type EditorView,
  type ViewUpdate,
} from '@codemirror/view';

import { mountTemplatesMenu, type TemplatesMenu } from '../templates';


const emptyEditorOverlay = ViewPlugin.fromClass(
  class {
    private overlay: HTMLElement;
    private menu: TemplatesMenu | null = null;

    constructor(view: EditorView) {
      this.overlay = document.createElement('div');
      this.overlay.className = 'cm-empty-editor-overlay';

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'cm-empty-editor-overlay__template-btn';
      button.textContent = 'Start with a template';
      button.setAttribute('aria-label', 'Start with a template');

      this.menu = mountTemplatesMenu(button, view);
      this.overlay.append(button);
      view.dom.appendChild(this.overlay);
      this.sync(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged) this.sync(update.view);
    }

    destroy() {
      this.menu?.destroy();
      this.menu = null;
      this.overlay.remove();
    }

    private sync(view: EditorView) {
      this.overlay.hidden = view.state.doc.length > 0;
    }
  },
);

export function emptyEditorPlaceholder(): Extension[] {
  return [emptyEditorOverlay];
}
