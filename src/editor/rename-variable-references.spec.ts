import assert from 'node:assert'
import { describe, it } from 'vitest'
import { history, undo } from '@codemirror/commands'
import { EditorSelection, EditorState, Transaction } from '@codemirror/state'
import { LRLanguage, syntaxTree } from '@codemirror/language'

import { parser } from '../language'
import {
	bindingIdentifierNameAt,
	bindingIdentifierTouched,
	referenceRenamesForBinding,
	referenceScanStart,
	renameVariableReferencesAnnotation,
	renameVariableReferencesHistoryConfig,
	RENAME_VARIABLE_REFERENCES_DELAY_MS,
} from './rename-variable-references'

const calcLanguage = LRLanguage.define({ name: 'calculus', parser })

function stateWithDoc(doc: string): EditorState {
	const state = EditorState.create({ doc, extensions: [calcLanguage] })
	syntaxTree(state)
	return state
}

function applyChanges(state: EditorState, changes: ReturnType<typeof referenceRenamesForBinding>): EditorState {
	if (changes.length === 0) return state
	return state.update({ changes }).state
}

function typeAt(state: EditorState, from: number, to: number, insert: string): EditorState {
	return state
		.update({
			changes: { from, to, insert },
			selection: EditorSelection.cursor(from + insert.length),
			annotations: Transaction.userEvent.of('input.type'),
		})
		.state
}

describe('referenceRenamesForBinding', () => {
	it('renames variable uses below the binding', () => {
		const doc = 'a = 1\nx = a + 1\nsqrt(a)'
		const state = stateWithDoc(doc)
		const bindingFrom = doc.indexOf('a =')
		const changes = referenceRenamesForBinding(state, bindingFrom, 'a', 'b')
		const next = applyChanges(state, changes)
		assert.strictEqual(next.doc.toString(), 'a = 1\nx = b + 1\nsqrt(b)')
	})

	it('does not rename references on the binding line', () => {
		const doc = 'a = a + 1\nx = a'
		const state = stateWithDoc(doc)
		const bindingFrom = 0
		const changes = referenceRenamesForBinding(state, bindingFrom, 'a', 'b')
		const next = applyChanges(state, changes)
		assert.strictEqual(next.doc.toString(), 'a = a + 1\nx = b')
	})

	it('stops at a later binding that reuses the initial name', () => {
		const doc = 'a = 1\nx = a\na = 5\ny = a'
		const state = stateWithDoc(doc)
		const bindingFrom = 0
		const changes = referenceRenamesForBinding(state, bindingFrom, 'a', 'b')
		const next = applyChanges(state, changes)
		assert.strictEqual(next.doc.toString(), 'a = 1\nx = b\na = 5\ny = a')
	})

	it('does not rename function names', () => {
		const doc = 'a = 1\nsqrt(a)'
		const state = stateWithDoc(doc)
		const changes = referenceRenamesForBinding(state, 0, 'a', 'b')
		assert.ok(changes.every((change) => !('insert' in change) || change.insert !== 'sqrt'))
	})

	it('starts scanning at the next statement', () => {
		const doc = 'a = 1\nb = 2'
		const state = stateWithDoc(doc)
		assert.strictEqual(referenceScanStart(state, 0), doc.indexOf('b'))
	})
})

describe('bindingIdentifierTouched', () => {
	it('detects edits inside a binding identifier', () => {
		const doc = 'monthly = 4200'
		const state = stateWithDoc(doc)
		const idStart = doc.indexOf('monthly')
		const touched = bindingIdentifierTouched(state, idStart + 3, idStart + 4)
		assert.strictEqual(touched?.bindingFrom, 0)
	})
})

describe('bindingIdentifierNameAt', () => {
	it('reads the current binding identifier text', () => {
		const doc = 'rate = 5'
		const state = stateWithDoc(doc)
		assert.strictEqual(bindingIdentifierNameAt(state, 0), 'rate')
	})
})

describe('rename tracking flow', () => {
	it('applies renames after the binding identifier reaches its final name', () => {
		let state = stateWithDoc('a = 1\nx = a')
		const bindingFrom = 0

		state = typeAt(state, 0, 1, 'b')
		syntaxTree(state)

		const newName = bindingIdentifierNameAt(state, bindingFrom)
		assert.strictEqual(newName, 'b')

		const changes = referenceRenamesForBinding(state, bindingFrom, 'a', newName!)
		state = applyChanges(state, changes)
		assert.strictEqual(state.doc.toString(), 'b = 1\nx = b')
	})

	it('does not apply renames when old and new names match', () => {
		const state = stateWithDoc('a = 1\nx = a')
		assert.deepStrictEqual(referenceRenamesForBinding(state, 0, 'a', 'a'), [])
	})
})

describe('rename reference history', () => {
	it('undoes reference renames together with the binding rename', () => {
		const doc = 'a = 1\nx = a'
		let state = EditorState.create({
			doc,
			extensions: [calcLanguage, history(renameVariableReferencesHistoryConfig)],
		})
		syntaxTree(state)

		const t0 = 1_000
		state = state
			.update({
				changes: { from: 0, to: 1, insert: 'b' },
				annotations: [
					Transaction.userEvent.of('input.type'),
					Transaction.time.of(t0),
				],
			})
			.state
		syntaxTree(state)

		const refChanges = referenceRenamesForBinding(state, 0, 'a', 'b')
		assert.strictEqual(refChanges.length, 1)
		state = state
			.update({
				changes: refChanges,
				annotations: [
					renameVariableReferencesAnnotation.of(true),
					Transaction.time.of(t0 + RENAME_VARIABLE_REFERENCES_DELAY_MS),
				],
			})
			.state

		assert.strictEqual(state.doc.toString(), 'b = 1\nx = b')

		let undone = false
		undo({
			state,
			dispatch(tr) {
				state = tr.state
				undone = true
			},
		})

		assert.ok(undone)
		assert.strictEqual(state.doc.toString(), doc)
	})
})
