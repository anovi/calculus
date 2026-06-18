import assert from 'node:assert';
import { afterEach, beforeEach, describe, it, vi } from 'vitest';
import { EditorSelection, EditorState, Transaction } from '@codemirror/state';
import { LRLanguage } from '@codemirror/language';

import { parser } from '../../language';
import { formatOnType } from '../formatting';

const MOBILE_UA =
	'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15';
const DESKTOP_UA =
	'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';

const calcLanguage = LRLanguage.define({
	name: 'compio',
	parser,
});

function typeAt(state: EditorState, pos: number, text: string): EditorState {
	return state
		.update({
			changes: { from: pos, insert: text },
			selection: EditorSelection.cursor(pos + text.length),
			annotations: Transaction.userEvent.of('input.type'),
		})
		.state;
}

function deleteRange(state: EditorState, from: number, to: number): EditorState {
	return state
		.update({
			changes: { from, to },
			selection: EditorSelection.cursor(from),
			annotations: Transaction.userEvent.of('delete.backward'),
		})
		.state;
}

function pasteAt(state: EditorState, pos: number, text: string): EditorState {
	return state
		.update({
			changes: { from: pos, insert: text },
			selection: EditorSelection.cursor(pos + text.length),
			annotations: Transaction.userEvent.of('input.paste'),
		})
		.state;
}

function stubUserAgent(ua: string) {
	vi.stubGlobal('navigator', { userAgent: ua });
}

describe('formatOnType', () => {
	beforeEach(() => stubUserAgent(MOBILE_UA));
	afterEach(() => vi.unstubAllGlobals());
	it('inserts spaces while typing', () => {
		const state = EditorState.create({
			doc: '1+',
			selection: EditorSelection.cursor(2),
			extensions: [calcLanguage, formatOnType()],
		});
		const next = typeAt(state, 2, '1');
		assert.strictEqual(next.doc.toString(), '1 + 1');
	});

	it('does not format on deletion', () => {
		const state = EditorState.create({
			doc: '1 + 1',
			selection: EditorSelection.cursor(2),
			extensions: [calcLanguage, formatOnType()],
		});
		const next = deleteRange(state, 1, 2);
		assert.strictEqual(next.doc.toString(), '1+ 1');
	});

	it('does not add spaces around exponent', () => {
		const state = EditorState.create({
			doc: '2^',
			selection: EditorSelection.cursor(2),
			extensions: [calcLanguage, formatOnType()],
		});
		const next = typeAt(state, 2, '2');
		assert.strictEqual(next.doc.toString(), '2^2');
	});

	it('spaces multiply but not exponent in mixed expression', () => {
		const state = EditorState.create({
			doc: '2*2^',
			selection: EditorSelection.cursor(4),
			extensions: [calcLanguage, formatOnType()],
		});
		const next = typeAt(state, 4, '3');
		assert.strictEqual(next.doc.toString(), '2 * 2^3');
	});

	it('does not format on desktop', () => {
		vi.unstubAllGlobals();
		stubUserAgent(DESKTOP_UA);
		const state = EditorState.create({
			doc: '1+',
			selection: EditorSelection.cursor(2),
			extensions: [calcLanguage, formatOnType()],
		});
		const next = typeAt(state, 2, '1');
		assert.strictEqual(next.doc.toString(), '1+1');
	});

	it('does not format on paste', () => {
		const state = EditorState.create({
			doc: '1+',
			selection: EditorSelection.cursor(2),
			extensions: [calcLanguage, formatOnType()],
		});
		const next = pasteAt(state, 2, '1');
		assert.strictEqual(next.doc.toString(), '1+1');
	});

	it('does not format on undo', () => {
		const state = EditorState.create({
			doc: '1 + 1',
			selection: EditorSelection.cursor(5),
			extensions: [calcLanguage, formatOnType()],
		});
		const undone = state
			.update({
				changes: { from: 0, to: 5, insert: '1+1' },
				selection: EditorSelection.cursor(3),
				annotations: Transaction.userEvent.of('undo'),
			})
			.state;
		assert.strictEqual(undone.doc.toString(), '1+1');
	});
});
