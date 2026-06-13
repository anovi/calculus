import {
  Decoration,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
  type EditorView,
  type ViewUpdate,
} from '@codemirror/view';

import { mountTemplatesMenu, type TemplatesMenu } from '../templates';

class EmptyPlaceholderWidget extends WidgetType {
  private menu: TemplatesMenu | null = null;

  eq(): boolean {
    return true;
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'cm-placeholder cm-empty-editor-placeholder';
    wrap.setAttribute('contenteditable', 'false');
    wrap.append('Write a formula, variable, or ');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cm-empty-editor-placeholder__template-btn';
    button.textContent = 'start with a template';
    button.setAttribute('aria-label', 'Start with a template');

    this.menu = mountTemplatesMenu(button, view);
    wrap.append(button);
    return wrap;
  }

  destroy(): void {
    this.menu?.destroy();
    this.menu = null;
  }
}

function buildDecorations(view: EditorView): DecorationSet {
  if (view.state.doc.length > 0) return Decoration.none;
  return Decoration.set([
    Decoration.widget({
      widget: new EmptyPlaceholderWidget(),
      side: 1,
    }).range(0),
  ]);
}

export function emptyEditorPlaceholder() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = buildDecorations(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged) {
          this.decorations = buildDecorations(update.view);
        }
      }
    },
    { decorations: (v) => v.decorations },
  );
}
