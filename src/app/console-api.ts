import type { EditorView } from '@codemirror/view'

declare global {
  interface Window {
    /** Hidden: copy document source (no calculated results) to the clipboard. Returns the text. */
    calculusCopySource?: () => string
    /** @deprecated Hidden alias — use calculusCopySource() */
    copyTextToClipboard?: (text?: string) => string
  }
}

function copyWithTextarea(text: string): boolean {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:none;opacity:0'
  document.body.appendChild(textarea)
  textarea.focus()
  textarea.select()
  textarea.setSelectionRange(0, text.length)
  let ok = false
  try {
    ok = document.execCommand('copy')
  } finally {
    document.body.removeChild(textarea)
  }
  return ok
}

function getSource(getView: () => EditorView | null): string {
  const view = getView()
  if (!view) {
    console.warn('calculusCopySource: editor not ready')
    return ''
  }
  return view.state.doc.toString()
}

function copySource(getView: () => EditorView | null, text?: string): string {
  const source = text ?? getSource(getView)
  if (!source) return source

  const view = getView()
  view?.focus()
  if (!copyWithTextarea(source)) {
    console.info('calculusCopySource: clipboard write failed — in DevTools run copy(calculusCopySource())')
  }
  return source
}

export function exposeConsoleApi(getView: () => EditorView | null): void {
  window.calculusCopySource = () => copySource(getView)
  window.copyTextToClipboard = (text?: string) => copySource(getView, text)
}
