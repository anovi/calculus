import assert from 'node:assert';
import { buildParser } from "@lezer/generator";
import { IterMode, Tree } from "@lezer/common"
import grammarSource from './calculus-language.grammar?raw';
import { parseFixtures } from './calculus-language-grammar.fixtures';

const parser = buildParser(grammarSource, {
	moduleStyle: 'es',
	fileName: 'calculus.build'
})

const TREE_RULER = '-'.repeat(30);

function formatTreeBody(tree: Tree): string {
	const lines: string[] = [];
	let level = 0;
	tree.iterate({
		enter: (node) => {
			lines.push(' '.repeat(level * 2) + node.name);
			level++;
		},
		leave: () => {
			level--;
		},
		mode: IterMode.IncludeAnonymous,
	});
	return lines.join('\n');
}

function formatTree(tree: Tree): string {
	return [TREE_RULER, formatTreeBody(tree), TREE_RULER].join('\n');
}

/** Logs tree with dashed rules; node lines match what `assertMatchTree` compares. */
export function printTree(tree: Tree) {
	console.log(formatTree(tree));
}

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

	it.each(parseFixtures)('$name', ({ doc, expectedTree }) => {
		const result = parser.parse(doc);
		assert.ok(result instanceof Tree);
		assertMatchTree(result, expectedTree);
	});
})
