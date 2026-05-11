import { IterMode, Tree } from "@lezer/common"

const TREE_RULER = '-'.repeat(30);

export function formatTreeBody(tree: Tree): string {
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