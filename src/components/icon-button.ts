
import { iconSvg, type IconName } from './icons'


function buttonIcon(svg: string): HTMLSpanElement {
  const markup = svg
    .replace(/\bfill="black"/gi, 'fill="currentColor"')
    .replace(/<svg\b/, '<svg class="button-icon__svg"')

  const wrap = document.createElement('span')
  wrap.className = 'button-icon'
  wrap.setAttribute('aria-hidden', 'true')
  wrap.innerHTML = markup
  return wrap
}

export type IconButtonOptions = {
  icon: IconName
  ariaLabel: string
  className?: string
  id?: string
  onClick?: () => void
}

export function createIconButton(options: IconButtonOptions): HTMLButtonElement {
  const button = document.createElement('button')
  button.type = 'button'
  if (options.className) button.className = options.className
  if (options.id) button.id = options.id
  button.setAttribute('aria-label', options.ariaLabel)
  setIconButtonIcon(button, options.icon)
  if (options.onClick) button.addEventListener('click', options.onClick)
  return button
}

export function setIconButtonIcon(button: HTMLButtonElement, icon: IconName): void {
  button.replaceChildren(buttonIcon(iconSvg(icon)))
}
