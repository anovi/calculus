import type { EditorView } from '@codemirror/view';

import { bindFocusPreservingButton } from './focus-preserving-button';
import { isMobileDevice } from '../lib/mobile-device';

export type DropdownMenu = {
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: () => boolean;
  destroy: () => void;
};

export type MountDropdownMenuOptions = {
  /** Prefix for backdrop element id, e.g. 'functions-menu'. */
  id?: string;
  /** Extra class on the menu root (e.g. variant-specific styling). */
  menuClassName?: string;
  renderContent: (scroll: HTMLElement, close: () => void) => void;
  /** Horizontal scroll row containing the trigger (mobile toolbar). */
  scrollContainer?: HTMLElement;
  /** Dismiss the editor keyboard when opening (mobile toolbar). */
  blurEditorOnOpen?: boolean;
  view?: EditorView;
};

export type DropdownSectionOptions = {
  heading: string;
  intro?: string;
  items: HTMLElement[];
};

function blurEditor(view: EditorView): void {
  view.contentDOM.blur();
  const active = document.activeElement;
  if (active instanceof HTMLElement && view.dom.contains(active)) {
    active.blur();
  }
}

function positionDropdown(
  menu: HTMLElement,
  trigger: HTMLElement,
  margin: number,
): void {
  const rect = trigger.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxPreferredHeight = viewportHeight * 0.8;
  const spaceBelow = viewportHeight - rect.bottom - margin;
  const spaceAbove = rect.top - margin;

  menu.style.right = `${Math.max(margin, viewportWidth - rect.right)}px`;
  menu.style.left = 'auto';

  if (spaceBelow >= spaceAbove) {
    menu.style.top = `${rect.bottom + margin}px`;
    menu.style.bottom = 'auto';
    menu.style.maxHeight = `${Math.max(0, Math.min(maxPreferredHeight, spaceBelow))}px`;
  } else {
    menu.style.top = 'auto';
    menu.style.bottom = `${viewportHeight - rect.top + margin}px`;
    menu.style.maxHeight = `${Math.max(0, Math.min(maxPreferredHeight, spaceAbove))}px`;
  }
}

function positionMobileMenu(menu: HTMLElement): void {
  const topPanel = document.querySelector('#editor .cm-panels-top');
  menu.style.top = topPanel
    ? `${topPanel.getBoundingClientRect().bottom}px`
    : '';
}

export type CreateDropdownItemOptions = {
  /** Show description without hover/focus (e.g. templates menu). */
  alwaysShowDescription?: boolean;
};

export function createDropdownItem(
  name: string,
  description: string,
  onClick: () => void,
  options?: CreateDropdownItemOptions,
): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = options?.alwaysShowDescription
    ? 'dropdown-menu__item dropdown-menu__item--show-doc'
    : 'dropdown-menu__item';

  const nameEl = document.createElement('span');
  nameEl.className = 'dropdown-menu__name';
  nameEl.textContent = name;

  const doc = document.createElement('span');
  doc.className = 'dropdown-menu__doc';
  doc.textContent = description;

  button.append(nameEl, doc);
  button.addEventListener('click', onClick);
  return button;
}

export function createDropdownList(items: HTMLElement[]): HTMLDivElement {
  const list = document.createElement('div');
  list.className = 'dropdown-menu__list';
  list.append(...items);
  return list;
}

export function createDropdownCloseButton(onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dropdown-menu__close';
  button.textContent = 'Close';
  button.addEventListener('click', onClick);
  return button;
}

export function createDropdownSection({
  heading,
  intro,
  items,
}: DropdownSectionOptions): HTMLElement {
  const sectionEl = document.createElement('section');
  sectionEl.className = 'dropdown-menu__section';

  const headingEl = document.createElement('h3');
  headingEl.className = 'dropdown-menu__heading';
  headingEl.textContent = heading;
  sectionEl.append(headingEl);

  if (intro) {
    const introEl = document.createElement('p');
    introEl.className = 'dropdown-menu__intro';
    introEl.textContent = intro;
    sectionEl.append(introEl);
  }

  sectionEl.append(createDropdownList(items));
  return sectionEl;
}

export function mountDropdownMenu(
  trigger: HTMLButtonElement,
  options: MountDropdownMenuOptions,
): DropdownMenu {
  const mobile = isMobileDevice();
  const blurEditorOnOpen = options.blurEditorOnOpen ?? mobile;
  const margin = 6;
  const idPrefix = options.id ?? 'dropdown-menu';
  let isOpen = false;

  const backdrop = document.createElement('div');
  backdrop.id = `${idPrefix}-backdrop`;
  backdrop.className = 'dropdown-menu-backdrop';
  backdrop.hidden = true;
  backdrop.setAttribute('aria-hidden', 'true');
  document.body.append(backdrop);

  const menu = document.createElement('div');
  menu.className = mobile
    ? 'dropdown-menu dropdown-menu--mobile cm-tooltip'
    : 'dropdown-menu dropdown-menu--desktop cm-tooltip';
  if (options.menuClassName) {
    menu.classList.add(options.menuClassName);
  }
  menu.setAttribute('role', 'menu');
  menu.hidden = true;
  document.body.append(menu);

  const scroll = document.createElement('div');
  scroll.className = 'dropdown-menu__scroll';
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

  const open = () => {
    if (isOpen) return;
    options.renderContent(scroll, close);
    if (mobile) positionMobileMenu(menu);
    else positionDropdown(menu, trigger, margin);
    menu.hidden = false;
    backdrop.hidden = false;
    backdrop.setAttribute('aria-hidden', 'false');
    trigger.setAttribute('aria-expanded', 'true');
    isOpen = true;
    if (blurEditorOnOpen && options.view) blurEditor(options.view);
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
    bindFocusPreservingButton(trigger, toggle, options.scrollContainer);
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
