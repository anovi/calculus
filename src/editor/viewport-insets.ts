import type { Extension } from '@codemirror/state'
import {
  repositionTooltips,
  tooltips,
  ViewPlugin,
  type EditorView,
  type Rect,
} from '@codemirror/view'

import { isMobileDevice } from '../lib/mobile-device'

/** Fixed height of the top document-controls toolbar and bottom suggestions panel. */
export const TOOLBAR_HEIGHT = 48

/** Minimal Virtual Keyboard API surface (Chrome Android; not in all TS libs). */
interface VirtualKeyboard {
  readonly boundingRect: DOMRectReadOnly
  addEventListener(type: 'geometrychange', listener: (e: Event) => void): void
  removeEventListener(type: 'geometrychange', listener: (e: Event) => void): void
}

export function getVirtualKeyboard(): VirtualKeyboard | null {
  if (!('virtualKeyboard' in navigator)) return null
  return (navigator as Navigator & { virtualKeyboard: VirtualKeyboard }).virtualKeyboard
}

/**
 * Distance from the layout viewport bottom to the visual viewport bottom.
 * On Chrome Android (default `interactive-widget=resizes-visual`) the layout
 * viewport does not shrink when the keyboard opens, but visualViewport.height does.
 * Fixed `bottom: 0` elements must offset by this value to sit above the keyboard.
 *
 * Do not subtract visualViewport.offsetTop on iOS: when the caret is below the
 * keyboard, Safari raises offsetTop to scroll the focused line into view; subtracting
 * it again pushes fixed UI under the keyboard.
 */
export function keyboardInsetFromVisualViewport(): number {
  const vv = window.visualViewport
  if (!vv) return 0
  return Math.max(0, vv.height + vv.offsetTop)
}

/** Y coordinate of the top edge of the bottom suggestions panel. */
export function bottomPanelTopInset(): number {
  return keyboardInsetFromVisualViewport() - TOOLBAR_HEIGHT
}

export function visualViewportBottom(): number {
  const vv = window.visualViewport
  if (!vv) return document.documentElement.clientHeight
  return vv.offsetTop + vv.height
}

/** Rectangle available for editor tooltips, excluding top toolbar and mobile bottom panel. */
export function computeEditorTooltipSpace(view: EditorView): Rect {
  const scroll = view.scrollDOM.getBoundingClientRect()
  let bottom = visualViewportBottom()

  if (isMobileDevice() && view.hasFocus) {
    bottom = Math.min(bottom, bottomPanelTopInset())
  }

  return {
    top: scroll.top,
    left: scroll.left,
    bottom,
    right: scroll.right,
  }
}

const tooltipSpaceSyncPlugin = ViewPlugin.fromClass(class {
  #view: EditorView
  #onGeometryChange: () => void
  #vv: VisualViewport | null
  #virtualKeyboard: VirtualKeyboard | null

  constructor(view: EditorView) {
    this.#view = view
    this.#onGeometryChange = () => { repositionTooltips(this.#view) }
    this.#vv = window.visualViewport
    this.#virtualKeyboard = getVirtualKeyboard()
    this.#vv?.addEventListener('resize', this.#onGeometryChange)
    this.#vv?.addEventListener('scroll', this.#onGeometryChange) //this actually never called - viewport never scrolls
    this.#virtualKeyboard?.addEventListener('geometrychange', this.#onGeometryChange)
  }

  destroy() {
    this.#vv?.removeEventListener('resize', this.#onGeometryChange)
    this.#vv?.removeEventListener('scroll', this.#onGeometryChange)
    this.#virtualKeyboard?.removeEventListener('geometrychange', this.#onGeometryChange)
  }
})

/** Tooltip positioning that respects editor chrome and virtual-keyboard insets. */
export function editorTooltipExtensions(): Extension[] {
  return [
    tooltips({ tooltipSpace: computeEditorTooltipSpace }),
    tooltipSpaceSyncPlugin,
  ]
}
