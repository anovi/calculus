import { type Extension } from '@codemirror/state'
import { EditorView, ViewPlugin } from '@codemirror/view'

/** Safari (incl. iOS); excludes Chromium-based browsers that also report Safari in UA. */
function isSafari(): boolean {
	return true;
	// const ua = navigator.userAgent
	// return /Safari/.test(ua) && !/Chrome|Chromium|CriOS|Edg|OPR|FxiOS/.test(ua)
}

const safariFocusScrollFixPlugin = ViewPlugin.fromClass(
	class {
		#timeoutId: ReturnType<typeof setTimeout> | ReturnType<typeof requestAnimationFrame> | undefined
		#view: EditorView

		constructor(view: EditorView) {
			this.#view = view
			view.dom.addEventListener('focusin', this.#onFocusIn)
		}

		#onFocusIn = () => {
			console.log('focus')
			const editor = this.#view.dom
			editor.style.opacity = '0'
			if (this.#timeoutId !== undefined) clearTimeout(this.#timeoutId)
			this.#timeoutId = setTimeout(() => {
				editor.style.opacity = '1'
				this.#timeoutId = undefined
			}, 1)
		}

		destroy() {
			this.#view.dom.removeEventListener('focusin', this.#onFocusIn)
			if (this.#timeoutId !== undefined) clearTimeout(this.#timeoutId)
		}
	},
)

/** Hide the editor for one frame on focus so Safari's scroll-into-view is not visible. */
export function safariFocusScrollFix(): Extension {
	return isSafari() ? safariFocusScrollFixPlugin : []
}
