import type { EditorView } from '@codemirror/view';

import { bindFocusPreservingButton } from '../components/focus-preserving-button';
import { isMobileDevice } from '../lib/mobile-device';
import type { BuiltinFunction } from '../calculator';
import { FUNCTION_MENU_SECTIONS } from './function-menu-sections';
import { insertBuiltinFunction } from '../editor';

export type FunctionsMenu = {
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
  destroy: () => void;
};

export type MountFunctionsMenuOptions = {
  /** Horizontal scroll row containing the trigger (mobile toolbar). */
  scrollContainer?: HTMLElement;
  /** Dismiss the editor keyboard when opening (mobile toolbar). */
  blurEditorOnOpen?: boolean;
};

function blurEditor(view: EditorView): void {
  view.contentDOM.blur();
  const active = document.activeElement;
  if (active instanceof HTMLElement && view.dom.contains(active)) {
    active.blur();
  }
}

function createFunctionItem(
  fnDef: BuiltinFunction,
  onSelect: (fnDef: BuiltinFunction) => void,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'functions-menu__item';

  const name = document.createElement('span');
  name.className = 'functions-menu__name';
  name.textContent = `${fnDef.name}()`;

  const doc = document.createElement('span');
  doc.className = 'functions-menu__doc';
  doc.textContent = fnDef.doc ?? '';

  button.append(name, doc);
  button.addEventListener('click', () => onSelect(fnDef));
  return button;
}

function renderMenuContent(
  container: HTMLElement,
  onSelect: (fnDef: BuiltinFunction) => void,
): void {
  container.replaceChildren();

  for (const section of FUNCTION_MENU_SECTIONS) {
    const sectionEl = document.createElement('section');
    sectionEl.className = 'functions-menu__section';

    const heading = document.createElement('h3');
    heading.className = 'functions-menu__heading';
    heading.textContent = section.label;
    sectionEl.append(heading);

    if (section.intro) {
      const intro = document.createElement('p');
      intro.className = 'functions-menu__intro';
      intro.textContent = section.intro;
      sectionEl.append(intro);
    }

    const list = document.createElement('div');
    list.className = 'functions-menu__list';
    for (const fnDef of section.functions) {
      list.append(createFunctionItem(fnDef, onSelect));
    }
    sectionEl.append(list);
    container.append(sectionEl);
  }
}

function positionDropdown(
  menu: HTMLElement,
  trigger: HTMLElement,
  margin: number,
): void {
  const rect = trigger.getBoundingClientRect();
  menu.style.top = `${rect.bottom + margin}px`;
  menu.style.right = `${Math.max(margin, window.innerWidth - rect.right)}px`;
  menu.style.left = 'auto';
}

function positionMobileMenu(menu: HTMLElement): void {
  const topPanel = document.querySelector('#editor .cm-panels-top');
  menu.style.top = topPanel
    ? `${topPanel.getBoundingClientRect().bottom}px`
    : '';
}

export function mountFunctionsMenu(
  trigger: HTMLButtonElement,
  view: EditorView,
  options: MountFunctionsMenuOptions = {},
): FunctionsMenu {
  const mobile = isMobileDevice();
  const blurEditorOnOpen = options.blurEditorOnOpen ?? mobile;
  const margin = 6;
  let isOpen = false;

  const backdrop = document.createElement('div');
  backdrop.id = 'functions-menu-backdrop';
  backdrop.className = 'functions-menu-backdrop';
  backdrop.hidden = true;
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.append(backdrop);

  const menu = document.createElement('div');
  menu.className = mobile
    ? 'functions-menu functions-menu--mobile cm-tooltip'
    : 'functions-menu functions-menu--desktop cm-tooltip';
  menu.setAttribute('role', 'menu');
  menu.hidden = true;
  document.body.append(menu);

  const scroll = document.createElement('div');
  scroll.className = 'functions-menu__scroll';
  menu.append(scroll);

  const close = () => {
    if (!isOpen) return;
    menu.hidden = true;
    backdrop.hidden = true;
    backdrop.setAttribute('aria-hidden', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    isOpen = false;
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('resize', onLayoutChange);
    window.removeEventListener('scroll', onLayoutChange, true);
  };

  const onSelect = (fnDef: BuiltinFunction) => {
    insertBuiltinFunction(view, fnDef);
    close();
  };

  const open = () => {
    if (isOpen) return;
    renderMenuContent(scroll, onSelect);
    if (mobile) positionMobileMenu(menu);
    else positionDropdown(menu, trigger, margin);
    menu.hidden = false;
    backdrop.hidden = false;
    backdrop.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    isOpen = true;
    if (blurEditorOnOpen) blurEditor(view);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onLayoutChange);
    window.addEventListener('scroll', onLayoutChange, true);
  };

  const toggle = () => {
    if (isOpen) close();
    else open();
  };

  const onPointerDown = (event: PointerEvent) => {
    const target = event.target as Node;
    if (menu.contains(target) || trigger.contains(target)) return;
    close();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close();
  };

  const onLayoutChange = () => {
    if (!isOpen) return;
    if (mobile) positionMobileMenu(menu);
    else positionDropdown(menu, trigger, margin);
  };

  backdrop.addEventListener('click', close);

  trigger.setAttribute('aria-haspopup', 'menu');
  trigger.setAttribute('aria-expanded', 'false');

  if (mobile) {
    trigger.addEventListener('click', () => toggle());
  } else {
    bindFocusPreservingButton(trigger, toggle);
  }

  return {
    open,
    close,
    toggle,
    isOpen: () => isOpen,
    destroy: () => {
      close();
      backdrop.remove();
      menu.remove();
    },
  };
}
