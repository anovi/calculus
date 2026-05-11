import assert from 'node:assert';
import { buildParser } from "@lezer/generator";
import { Tree } from "@lezer/common"
import grammarSource from './calculus-language.grammar?raw';
import { parseFixtures } from './calculus-language-grammar.fixtures';
import { formatTreeBody, printTree } from '../lib/tree';

const parser = buildParser(grammarSource, {
	moduleStyle: 'es',
	fileName: 'calculus.build'
})



function assertMatchTree(tree: Tree, expected: string) {
	const actual = formatTreeBody(tree);
	if (actual !== expected) {
		printTree(tree);
	}
	assert.strictEqual(actual, expected);
}


describe('CalcDoc grammar', () => {
	
	it('should build parser', () => {
		assert.ok(parser);
	})

	for (const { name, doc, expectedTree } of parseFixtures) {
		it(name, () => {
			const result = parser.parse(doc);
			assert.ok(result instanceof Tree);
			assertMatchTree(result, expectedTree);
		});
	}
})
