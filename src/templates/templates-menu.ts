import type { EditorView } from '@codemirror/view';

import {
  createDropdownItem,
  createDropdownList,
  mountDropdownMenu,
  type DropdownMenu,
} from '../components/dropdown-menu';
import { TEMPLATES } from './templates-data';
import { insertTemplate } from './insert-template';

export type TemplatesMenu = DropdownMenu;

export function mountTemplatesMenu(
  trigger: HTMLButtonElement,
  view: EditorView,
): TemplatesMenu {
  return mountDropdownMenu(trigger, {
    id: 'templates-menu',
    view,
    renderContent: (scroll, close) => {
      scroll.replaceChildren(
        createDropdownList(
          TEMPLATES.map((template) =>
            createDropdownItem(
              template.name,
              template.description,
              () => {
                insertTemplate(view, template.content);
                close();
              },
              { alwaysShowDescription: true },
            ),
          ),
        ),
      );
    },
  });
}
