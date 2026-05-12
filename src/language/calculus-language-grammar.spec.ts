import assert from 'node:assert';
import { Tree } from "@lezer/common"

import { formatTreeBody, printTree } from '../lib/tree';
import { parseFixtures } from './calculus-language-grammar.fixtures';
import { calculusParser } from './inline-units/parser';


function assertMatchTree(tree: Tree, expected: string) {
	const actual = formatTreeBody(tree);
	if (actual !== expected) {
		printTree(tree);
	}
	assert.strictEqual(actual, expected);
}

describe('CalcDoc grammar', () => {
	
	it('should build parser', () => {
		assert.ok(calculusParser);
	})

	for (const { name, doc, expectedTree } of parseFixtures) {
		it(name, () => {
			const result = calculusParser.parse(doc);
			assert.ok(result instanceof Tree);
			assertMatchTree(result, expectedTree);
		});
	}
})
