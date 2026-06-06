import assert from 'node:assert'
import { describe, it } from 'vitest'
import { foldEffect, foldState, LRLanguage, syntaxTree } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'

import { parser } from '../../language'
import {
	editorLines,
	getVisibleEditorLines,
	isInFoldedRange,
	isRangesOverlap,
	isRangeSubrangeOf,
	iterateTreeVisibleRanges,
} from './range'

const calcLanguage = LRLanguage.define({ name: 'calculus', parser })

function stateWithFold(doc: string, foldFrom: number, foldTo: number): EditorState {
	return EditorState.create({
		doc,
		extensions: [foldState],
	})
		.update({ effects: foldEffect.of({ from: foldFrom, to: foldTo }) })
		.state
}

function mockView(
	state: EditorState,
	lineBlocks: Array<{ from: number; to: number }>,
	visibleRanges?: Array<{ from: number; to: number }>,
): EditorView {
	return {
		state,
		viewportLineBlocks: lineBlocks,
		visibleRanges: visibleRanges ?? [{ from: 0, to: state.doc.length }],
	} as unknown as EditorView
}

describe('isRangesOverlap', () => {
	it('returns true when ranges overlap', () => {
		assert.strictEqual(isRangesOverlap(0, 10, 5, 15), true)
		assert.strictEqual(isRangesOverlap(5, 15, 0, 10), true)
	})

	it('returns true when ranges touch at a boundary', () => {
		assert.strictEqual(isRangesOverlap(0, 5, 5, 10), true)
	})

	it('returns false when ranges are disjoint', () => {
		assert.strictEqual(isRangesOverlap(0, 5, 6, 10), false)
		assert.strictEqual(isRangesOverlap(6, 10, 0, 5), false)
	})

	it('returns true when one range is inside the other', () => {
		assert.strictEqual(isRangesOverlap(0, 20, 5, 10), true)
		assert.strictEqual(isRangesOverlap(5, 10, 0, 20), true)
	})

	it('returns true for identical ranges', () => {
		assert.strictEqual(isRangesOverlap(3, 8, 3, 8), true)
	})

	it('returns true for zero-width ranges at the same position', () => {
		assert.strictEqual(isRangesOverlap(5, 5, 5, 5), true)
	})
})

describe('isRangeSubrangeOf', () => {
	it('returns true when child is strictly inside parent', () => {
		assert.strictEqual(isRangeSubrangeOf([5, 10], [0, 20]), true)
	})

	it('returns true when child equals parent', () => {
		assert.strictEqual(isRangeSubrangeOf([0, 10], [0, 10]), true)
	})

	it('returns false when child extends past parent', () => {
		assert.strictEqual(isRangeSubrangeOf([0, 15], [5, 20]), false)
		assert.strictEqual(isRangeSubrangeOf([5, 25], [0, 20]), false)
	})

	it('returns false when ranges only partially overlap', () => {
		assert.strictEqual(isRangeSubrangeOf([0, 10], [5, 20]), false)
		assert.strictEqual(isRangeSubrangeOf([5, 20], [0, 10]), false)
	})
})

describe('isInFoldedRange', () => {
	it('returns false when there are no folded ranges', () => {
		const state = EditorState.create({ doc: 'a = 1', extensions: [foldState] })
		assert.strictEqual(isInFoldedRange(state, 0, 3), false)
	})

	it('returns true when the range overlaps a folded range', () => {
		const state = stateWithFold('abcdef', 2, 5)
		assert.strictEqual(isInFoldedRange(state, 3, 4), true)
		assert.strictEqual(isInFoldedRange(state, 1, 6), true)
	})

	it('returns false when the range is outside folded ranges', () => {
		const state = stateWithFold('abcdef', 2, 5)
		assert.strictEqual(isInFoldedRange(state, 0, 1), false)
		assert.strictEqual(isInFoldedRange(state, 6, 6), false)
	})
})

describe('editorLines', () => {
	it('returns viewport lines that overlap the requested range', () => {
		const state = EditorState.create({ doc: 'line one\nline two\nline three' })
		const lineOneEnd = state.doc.line(1).to
		const lineTwoEnd = state.doc.line(2).to
		const view = mockView(state, [
			{ from: 0, to: lineOneEnd },
			{ from: lineOneEnd + 1, to: lineTwoEnd },
			{ from: lineTwoEnd + 1, to: state.doc.length },
		])

		const lines = editorLines(view, 0, lineOneEnd)
		assert.strictEqual(lines.length, 1)
		assert.strictEqual(lines[0].from, 0)
	})

	it('excludes lines that overlap a folded range', () => {
		const doc = 'visible\nfolded\nstill visible'
		const foldedLine = doc.indexOf('folded')
		const state = stateWithFold(doc, foldedLine, foldedLine + 'folded'.length)
		const view = mockView(state, [
			{ from: state.doc.line(1).from, to: state.doc.line(1).to },
			{ from: state.doc.line(2).from, to: state.doc.line(2).to },
			{ from: state.doc.line(3).from, to: state.doc.line(3).to },
		])

		const lines = editorLines(view, 0, state.doc.length)
		assert.deepStrictEqual(
			lines.map((line) => state.doc.sliceString(line.from, line.to)),
			['visible', 'still visible'],
		)
	})

	it('excludes lines that only partially overlap a folded range', () => {
		const state = stateWithFold('0123456789', 5, 10)
		const view = mockView(state, [{ from: 0, to: 10 }])

		const lines = editorLines(view, 0, 10)
		assert.strictEqual(lines.length, 0)
	})
})

describe('getVisibleEditorLines', () => {
	it('returns viewport lines that overlap the requested range', () => {
		const state = EditorState.create({ doc: 'alpha\nbeta\ngamma' })
		const lineTwoEnd = state.doc.line(2).to
		const view = mockView(state, [
			{ from: state.doc.line(1).from, to: state.doc.line(1).to },
			{ from: state.doc.line(2).from, to: lineTwoEnd },
			{ from: state.doc.line(3).from, to: state.doc.length },
		])

		const lines = getVisibleEditorLines(view, state.doc.line(2).from, state.doc.length)
		assert.deepStrictEqual(
			lines.map((line) => state.doc.sliceString(line.from, line.to)),
			['beta', 'gamma'],
		)
	})

	it('excludes lines that are fully inside a folded range', () => {
		const doc = 'visible\nfolded\nstill visible'
		const foldedLine = doc.indexOf('folded')
		const state = stateWithFold(doc, foldedLine, foldedLine + 'folded'.length)
		const view = mockView(state, [
			{ from: state.doc.line(1).from, to: state.doc.line(1).to },
			{ from: state.doc.line(2).from, to: state.doc.line(2).to },
			{ from: state.doc.line(3).from, to: state.doc.line(3).to },
		])

		const lines = getVisibleEditorLines(view, 0, state.doc.length)
		assert.deepStrictEqual(
			lines.map((line) => state.doc.sliceString(line.from, line.to)),
			['visible', 'still visible'],
		)
	})

	it('keeps lines that only partially overlap a folded range', () => {
		const state = stateWithFold('0123456789', 5, 10)
		const view = mockView(state, [{ from: 0, to: 10 }])

		const lines = getVisibleEditorLines(view, 0, 10)
		assert.strictEqual(lines.length, 1)
		assert.deepStrictEqual(lines[0], { from: 0, to: 10 })
	})
})

describe('iterateTreeVisibleRanges', () => {
	it('visits syntax nodes inside each visible range', () => {
		const doc = 'a = 1\nx = a'
		const state = EditorState.create({ doc, extensions: [calcLanguage] })
		syntaxTree(state)

		const visited: string[] = []
		iterateTreeVisibleRanges(mockView(state, []), {
			enter(node) {
				if (node.name === 'Identifier') {
					visited.push(state.doc.sliceString(node.from, node.to))
				}
			},
		})

		assert.deepStrictEqual(visited, ['a', 'x', 'a'])
	})

	it('limits iteration to the provided visible ranges', () => {
		const doc = 'a = 1\nx = a'
		const secondLineFrom = doc.indexOf('x')
		const state = EditorState.create({ doc, extensions: [calcLanguage] })
		syntaxTree(state)

		const visited: string[] = []
		iterateTreeVisibleRanges(
			mockView(state, [], [{ from: secondLineFrom, to: doc.length }]),
			{
				enter(node) {
					if (node.name === 'Identifier') {
						visited.push(state.doc.sliceString(node.from, node.to))
					}
				},
			},
		)

		assert.deepStrictEqual(visited, ['x', 'a'])
	})
})
