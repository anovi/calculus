import assert from 'node:assert';
import { Tree } from "@lezer/common"

import { formatTreeBody, printTree } from '../lib/tree';
import { parseFixtures } from './compio-language-grammar.fixtures';
import { compioParser } from './baseline/parser';


function assertMatchTree(tree: Tree, expected: string) {
	const actual = formatTreeBody(tree);
	if (actual !== expected) {
		printTree(tree);
	}
	assert.strictEqual(actual, expected);
}

describe('CalcDoc grammar', () => {
	
	const configuredParser = compioParser.configure({ /* strict: true */ })

	it('should build parser', () => {
		assert.ok(compioParser);
	})

	for (const fx of parseFixtures) {
		const test = fx.only ? it.only : fx.skip ? it.skip : it;
		test(fx.name, () => {
			const result = configuredParser.parse(fx.doc);
			assert.ok(result instanceof Tree);
			assertMatchTree(result, fx.expectedTree);
		});
	}
})
