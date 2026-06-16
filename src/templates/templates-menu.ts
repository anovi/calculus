import type { EditorView } from '@codemirror/view';

import {
  createDropdownCloseButton,
  createDropdownItem,
  createDropdownList,
  mountDropdownMenu,
  type DropdownMenu,
} from '../components/dropdown-menu';
import { isMobileDevice } from '../lib/mobile-device';
import { TEMPLATES } from './templates-data';
import { insertTemplate } from './insert-template';

export type TemplatesMenu = DropdownMenu;

export function mountTemplatesMenu(
  trigger: HTMLButtonElement,
  view: EditorView,
): TemplatesMenu {
  return mountDropdownMenu(trigger, {
    id: 'templates-menu',
    menuClassName: 'dropdown-menu--templates',
    view,
    renderContent: (scroll, close) => {
      const list = createDropdownList(
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
      );
      scroll.replaceChildren(
        ...(isMobileDevice() ? [createDropdownCloseButton(close)] : []),
        list,
      );
    },
  });
}
