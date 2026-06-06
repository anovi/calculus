import { bindFocusPreservingButton } from './focus-preserving-button'
import { iconSvg, type IconName } from './icons'

export type PopupMenuItem =
  | { kind: 'action'; label: string; onClick: () => void; hidden?: boolean; id?: string; icon?: IconName }
  | { kind: 'link'; label: string; href: string; hidden?: boolean; id?: string; external?: boolean }
  | { kind: 'separator'; hidden?: boolean }

export type PopupMenuAlign = 'start' | 'end'

export type PopupMenuOptions = {
  items: PopupMenuItem[] | (() => PopupMenuItem[])
  className?: string
  align?: PopupMenuAlign
  margin?: number
  closeOnSelect?: boolean
  onOpen?: () => void
  onClose?: () => void
}

export type PopupMenu = {
  menu: HTMLElement
  open: () => void
  close: () => void
  toggle: () => void
  isOpen: () => boolean
  getItem: (id: string) => HTMLElement | null
  render: () => void
  destroy: () => void
}

function createMenuIcon(className: string, icon?: IconName): HTMLSpanElement {
  const el = document.createElement('span')
  el.className = icon ? `${className}__icon` : `${className}__icon ${className}__icon--spacer`
  el.setAttribute('aria-hidden', 'true')
  if (icon) {
    const markup = iconSvg(icon)
      .replace(/\bfill="black"/gi, 'fill="currentColor"')
      .replace(/<svg\b/, `<svg class="${className}__icon-svg"`)
    el.innerHTML = markup
  }
  return el
}

function appendMenuItemContent(
  parent: HTMLElement,
  className: string,
  label: string,
  icon?: IconName,
): void {
  const labelEl = document.createElement('span')
  labelEl.className = `${className}__label`
  labelEl.textContent = label
  parent.append(createMenuIcon(className, icon), labelEl)
}

function createMenuItem(
  entry: PopupMenuItem,
  className: string,
  onSelect: () => void,
  closeOnSelect: boolean,
): HTMLElement | null {
  if (entry.hidden) return null

  if (entry.kind === 'separator') {
    const sep = document.createElement('div')
    sep.className = `${className}__separator cm-tooltip-section`
    sep.setAttribute('role', 'separator')
    return sep
  }

  if (entry.kind === 'action') {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `${className}__item`
    appendMenuItemContent(button, className, entry.label, entry.icon)
    if (entry.id) button.dataset.popupMenuItemId = entry.id
    button.addEventListener('click', () => {
      entry.onClick()
      if (closeOnSelect) onSelect()
    })
    return button
  }

  const link = document.createElement('a')
  link.className = `${className}__item`
  link.href = entry.href
  appendMenuItemContent(link, className, entry.label)
  if (entry.id) link.dataset.popupMenuItemId = entry.id
  if (entry.external !== false) {
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
  }
  if (closeOnSelect) link.addEventListener('click', onSelect)
  return link
}

function positionMenu(
  menu: HTMLElement,
  trigger: HTMLElement,
  align: PopupMenuAlign,
  margin: number,
): void {
  const rect = trigger.getBoundingClientRect()
  menu.style.top = `${rect.bottom + margin}px`
  if (align === 'end') {
    menu.style.right = `${Math.max(margin, window.innerWidth - rect.right)}px`
    menu.style.left = 'auto'
  } else {
    menu.style.left = `${Math.max(margin, rect.left)}px`
    menu.style.right = 'auto'
  }
}

function resolveItems(items: PopupMenuOptions['items']): PopupMenuItem[] {
  return typeof items === 'function' ? items() : items
}

/** Toggle popup menu from a trigger button; styled like editor tooltips. */
export function mountPopupMenu(
  trigger: HTMLButtonElement,
  options: PopupMenuOptions,
): PopupMenu {
  const className = options.className ?? 'popup-menu'
  const align = options.align ?? 'end'
  const margin = options.margin ?? 6
  const closeOnSelect = options.closeOnSelect ?? true

  const menu = document.createElement('div')
  menu.className = `${className} cm-tooltip`
  menu.setAttribute('role', 'menu')
  menu.hidden = true
  document.body.append(menu)

  let isOpen = false

  const close = () => {
    if (!isOpen) return
    menu.hidden = true
    trigger.setAttribute('aria-expanded', 'false')
    isOpen = false
    document.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('keydown', onKeyDown)
    window.removeEventListener('resize', onLayoutChange)
    window.removeEventListener('scroll', onLayoutChange, true)
    options.onClose?.()
  }

  const render = () => {
    menu.replaceChildren()
    for (const entry of resolveItems(options.items)) {
      const el = createMenuItem(entry, className, close, closeOnSelect)
      if (el) menu.append(el)
    }
  }

  const open = () => {
    if (isOpen) return
    render()
    positionMenu(menu, trigger, align, margin)
    menu.hidden = false
    trigger.setAttribute('aria-expanded', 'true')
    isOpen = true
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onLayoutChange)
    window.addEventListener('scroll', onLayoutChange, true)
    options.onOpen?.()
  }

  const toggle = () => {
    if (isOpen) close()
    else open()
  }

  const onPointerDown = (event: PointerEvent) => {
    const target = event.target as Node
    if (menu.contains(target) || trigger.contains(target)) return
    close()
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') close()
  }

  const onLayoutChange = () => {
    if (isOpen) positionMenu(menu, trigger, align, margin)
  }

  trigger.setAttribute('aria-haspopup', 'menu')
  trigger.setAttribute('aria-expanded', 'false')
  bindFocusPreservingButton(trigger, toggle)

  return {
    menu,
    open,
    close,
    toggle,
    isOpen: () => isOpen,
    getItem: (id) => menu.querySelector<HTMLElement>(`[data-popup-menu-item-id="${id}"]`),
    render,
    destroy: () => {
      close()
      menu.remove()
    },
  }
}
