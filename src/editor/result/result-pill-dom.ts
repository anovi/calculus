import type { EditorView } from '@codemirror/view'

/** Result pill element anchored at a line-end widget position, if present. */
export function resultPillAt(view: EditorView, anchorPos: number): HTMLElement | null {
  let node: Node | null = view.domAtPos(anchorPos, -1).node
  while (node) {
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentElement
    }
    if (node?.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement
      if (el.classList.contains('cm-calc-result')) {
        return el.querySelector<HTMLElement>('.cm-calc-result__pill')
      }
      node = node.nextSibling
    }
  }
  return null
}

export function setResultPillActive(view: EditorView, anchorPos: number, active: boolean): void {
  resultPillAt(view, anchorPos)?.classList.toggle('cm-calc-result__pill--active', active)
}
