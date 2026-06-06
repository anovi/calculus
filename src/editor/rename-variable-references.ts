import { syntaxTree } from '@codemirror/language'
import {
	Annotation,
	Transaction,
	type ChangeSpec,
	type EditorState,
	type Extension,
} from '@codemirror/state'
import { EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view'

import { terms } from '../language'
import { isBindingIdentifier, isVariableReference } from './syntax-node'
import { isRangesOverlap } from '../lib/codemirror'


/** Marks transactions produced by reference renames so the plugin does not recurse. */
export const renameVariableReferencesAnnotation = Annotation.define<boolean>()

/** CodeMirror `linter()` default delay is 750ms. */
const LINTER_DELAY_MS = 750

/** Debounce before applying reference renames; must stay below linter and history group delay. */
export const RENAME_VARIABLE_REFERENCES_DELAY_MS = LINTER_DELAY_MS - 350

/** Current binding identifier text at the binding statement starting at `bindingFrom`. */
export function bindingIdentifierNameAt(state: EditorState, bindingFrom: number): string | null {
	const tree = syntaxTree(state)
	const node = tree.resolveInner(bindingFrom, 1)
	if (!isBindingIdentifier(node)) return null
	return state.sliceDoc(node.from, node.to)
}

/** Binding identifier whose span overlaps `[changeFrom, changeTo)` in `state`, if any. */
export function bindingIdentifierTouched(
	state: EditorState,
	changeFrom: number,
	changeTo: number,
): { bindingFrom: number; idFrom: number; idTo: number } | null {
	const tree = syntaxTree(state)
	const probes = new Set<number>([changeFrom])
	if (changeTo > changeFrom) probes.add(changeTo - 1)
	for (const pos of probes) {
		const node = tree.resolveInner(pos, -1)
		if (!isBindingIdentifier(node)) continue
		if (isRangesOverlap(changeFrom, changeTo, node.from, node.to)) {
			return { bindingFrom: node.parent!.from, idFrom: node.from, idTo: node.to }
		}
	}
	return null
}

/** Document position where reference scanning begins (next line after the binding). */
export function referenceScanStart(state: EditorState, bindingFrom: number): number {
	const bindingLine = state.doc.lineAt(bindingFrom)
	if (bindingLine.number >= state.doc.lines) return state.doc.length
	return state.doc.line(bindingLine.number + 1).from
}

/**
 * Collects reference renames for a binding rename from `oldName` to `newName`.
 * Scanning starts at the statement after `bindingFrom` and stops at EOF or when
 * another binding reuses `oldName`.
 */
export function referenceRenamesForBinding(
	state: EditorState,
	bindingFrom: number,
	oldName: string,
	newName: string,
): ChangeSpec[] {
	if (!oldName || oldName === newName) return []

	const scanFrom = referenceScanStart(state, bindingFrom)
	if (scanFrom >= state.doc.length) return []

	const tree = syntaxTree(state)
	const doc = state.doc
	const changes: ChangeSpec[] = []
	let stopped = false

	tree.iterate({
		from: scanFrom,
		to: doc.length,
		enter(node) {
			if (stopped) return false

			if (node.type.id === terms.Binding && node.from >= scanFrom) {
				const idNode = node.node.firstChild
				if (idNode?.type.id === terms.Identifier) {
					const bindingName = doc.sliceString(idNode.from, idNode.to)
					if (bindingName === oldName) {
						stopped = true
						return false
					}
				}
			}

			if (node.type.id === terms.Identifier && isVariableReference(node.node)) {
				const name = doc.sliceString(node.from, node.to)
				if (name === oldName) {
					changes.push({ from: node.from, to: node.to, insert: newName })
				}
			}
		},
	})

	return changes
}

/** History config so reference renames join the binding rename undo step. */
export const renameVariableReferencesHistoryConfig = {
	joinToEvent(tr: Transaction, isAdjacent: boolean) {
		return tr.annotation(renameVariableReferencesAnnotation) === true || isAdjacent
	},
}

type PendingRename = {
	bindingFrom: number
	initialName: string
}

class RenameVariableReferencesPlugin {
	private pending: PendingRename | null = null
	private debounceTimer: ReturnType<typeof setTimeout> | null = null
	private readonly view: EditorView

	constructor(view: EditorView) {
		this.view = view
	}

	update(update: ViewUpdate) {
		if (!update.docChanged) return

		for (const tr of update.transactions) {
			if (!tr.docChanged) continue
			if (tr.annotation(renameVariableReferencesAnnotation)) continue

			if (tr.isUserEvent('input.paste')) {
				this.clearPending()
				continue
			}

			if (tr.isUserEvent('undo') || tr.isUserEvent('redo')) {
				this.clearPending()
				continue
			}

			if (this.pending) {
				this.pending.bindingFrom = tr.changes.mapPos(this.pending.bindingFrom, 1)
			}

			tr.changes.iterChanges((fromA, toA) => {
				const touched = bindingIdentifierTouched(tr.startState, fromA, toA)
				if (!touched) return

				if (this.pending?.bindingFrom !== touched.bindingFrom) {
					this.pending = {
						bindingFrom: touched.bindingFrom,
						initialName: tr.startState.sliceDoc(touched.idFrom, touched.idTo),
					}
				}
				this.scheduleApply()
			})
		}
	}

	destroy() {
		this.clearPending()
	}

	private clearPending() {
		if (this.debounceTimer != null) {
			clearTimeout(this.debounceTimer)
			this.debounceTimer = null
		}
		this.pending = null
	}

	private scheduleApply() {
		if (this.debounceTimer != null) clearTimeout(this.debounceTimer)
		this.debounceTimer = setTimeout(() => {
			this.debounceTimer = null
			this.applyPending()
		}, RENAME_VARIABLE_REFERENCES_DELAY_MS)
	}

	private applyPending() {
		const pending = this.pending
		if (!pending) return
		this.pending = null

		const newName = bindingIdentifierNameAt(this.view.state, pending.bindingFrom)
		if (!newName || newName === pending.initialName) return

		const changes = referenceRenamesForBinding(
			this.view.state,
			pending.bindingFrom,
			pending.initialName,
			newName,
		)
		if (changes.length === 0) return

		this.view.dispatch({
			changes,
			annotations: renameVariableReferencesAnnotation.of(true),
		})
	}
}

/** Renames downstream variable references when a binding identifier is edited. */
export function renameVariableReferences(): Extension {
	return ViewPlugin.fromClass(RenameVariableReferencesPlugin)
}
