import assert from 'node:assert';
import { Tree } from '@lezer/common';
import { EditorState } from '@codemirror/state';

import { compioParser } from '../../language/baseline/parser';
import { applyFormatSpecs, formatTextLine } from '.';
import { formatLineFixtures } from './editor-commands.fixtures';

function applyFormatLine(doc: string): string {
	const tree = compioParser.configure({}).parse(doc);
	assert.ok(tree instanceof Tree);
	const changes = formatTextLine(tree, 0, doc.length);
	const state = EditorState.create({ doc });
	return applyFormatSpecs(state, changes).doc.toString();
}

function assertFormattedLine(doc: string, expected: string) {
	const actual = applyFormatLine(doc);
	assert.strictEqual(actual, expected);
}

describe('formatTextLine', () => {
	for (const fx of formatLineFixtures) {
		const test = fx.only ? it.only : fx.skip ? it.skip : it;
		test(fx.name, () => {
			assertFormattedLine(fx.doc, fx.expected);
		});
	}
});
