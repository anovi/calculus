import type { EditorView } from '@codemirror/view';

import {
  createDropdownItem,
  createDropdownSection,
  mountDropdownMenu,
  type DropdownMenu,
} from '../components/dropdown-menu';
import type { BuiltinFunction } from '../calculator';
import { FUNCTION_MENU_SECTIONS } from './function-menu-sections';
import { insertBuiltinFunction } from '../editor';

export type FunctionsMenu = DropdownMenu;

export type MountFunctionsMenuOptions = {
  /** Horizontal scroll row containing the trigger (mobile toolbar). */
  scrollContainer?: HTMLElement;
  /** Dismiss the editor keyboard when opening (mobile toolbar). */
  blurEditorOnOpen?: boolean;
};

function renderMenuContent(
  container: HTMLElement,
  view: EditorView,
  close: () => void,
): void {
  container.replaceChildren();

  for (const section of FUNCTION_MENU_SECTIONS) {
    const items = section.functions.map((fnDef: BuiltinFunction) =>
      createDropdownItem(`${fnDef.name}()`, fnDef.doc ?? '', () => {
        insertBuiltinFunction(view, fnDef);
        close();
      }),
    );
    container.append(
      createDropdownSection({
        heading: section.label,
        intro: section.intro,
        items,
      }),
    );
  }
}

export function mountFunctionsMenu(
  trigger: HTMLButtonElement,
  view: EditorView,
  options: MountFunctionsMenuOptions = {},
): FunctionsMenu {
  return mountDropdownMenu(trigger, {
    id: 'functions-menu',
    view,
    scrollContainer: options.scrollContainer,
    blurEditorOnOpen: options.blurEditorOnOpen,
    renderContent: (scroll, close) => renderMenuContent(scroll, view, close),
  });
}
