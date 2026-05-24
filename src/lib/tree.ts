import { IterMode, type NodeIterator, Tree } from "@lezer/common"

/** Node names from innermost to outermost, as returned by `Tree.resolveStack`. */
export function nodeStackNames(stack: NodeIterator | null): string[] {
	const names: string[] = [];
	for (let cur = stack; cur?.node; cur = cur.next) {
		names.push(cur.node.name);
	}
	return names;
}

const TREE_RULER = '-'.repeat(30);

export function formatTreeBody(tree: Tree, from?: number, to?: number): string {
	const lines: string[] = [];
	let level = 0;
	tree.iterate({
		from,
		to,
		mode: IterMode.IncludeAnonymous,
		enter: (node) => {
			lines.push(' '.repeat(level * 2) + node.name);
			level++;
		},
		leave: () => {
			level--;
		},
	});
	return lines.join('\n');
}

function formatTree(tree: Tree, from?: number, to?: number): string {
	return [TREE_RULER, formatTreeBody(tree, from, to), TREE_RULER].join('\n');
}

/** Logs tree with dashed rules; node lines match what `assertMatchTree` compares. */
export function printTree(tree: Tree, from?: number, to?: number) {
	console.log(formatTree(tree, from, to));
}