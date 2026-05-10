import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { buildParser } from "@lezer/generator";
import { IterMode, Tree } from "@lezer/common"


const grammarSource = fs.readFileSync(path.join(process.cwd(), './src/language/calculus-language.grammar'))
const parser = buildParser(grammarSource.toString(), {
	moduleStyle: 'es',
})

function printTree(tree: Tree) {
	console.log('-'.repeat(30));
	let level = 0;
	function printNode(name: string) {
		console.log(' '.repeat(level * 2) + name);
	}
	tree.iterate({
		enter: (node) => {
			printNode(node.name);
			level++;
		},
		leave: () => {
			level--;
		},
		mode: IterMode.IncludeAnonymous
	})
	console.log('-'.repeat(30));
}


describe('Query grammar', () => {
	
	it('should build parser', () => {
		assert.ok(parser);
	})
	it('should parse a simple query', () => {
		const query = `some = 123`;
		const result = parser.parse(query);
		assert.ok(result)
		assert.ok(result instanceof Tree)
		printTree(result);
	})

})
