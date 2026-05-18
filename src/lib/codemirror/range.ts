import { foldedRanges, syntaxTree } from '@codemirror/language';
import type {  SyntaxNodeRef } from '@lezer/common';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';


/**
 * Check if two ranges overlap
 * Based on the visual diagram on https://stackoverflow.com/a/25369187
 *
 * ### How it works
 *
 * It checks that the start of the first range is before the end of the second range:
 * ```
 * ----xxx--
 * --yyy----
 * ```
 *
 * And that the start of the second range is before the end of the first range:
 * ```
 * --xxx----
 * ----yyy--
 * ```
 *
 *
 * @param range1 - Range 1
 * @param range2 - Range 2
 * @returns True if the ranges overlap
 */
export function isRangesOverlap(
	range1: [number, number],
	range2: [number, number]
) {
	return range1[0] <= range2[1] && range2[0] <= range1[1];
}

/**
 * Check if a range is inside another range
 * @param parent - Parent (bigger) range
 * @param child - Child (smaller) range
 * @returns True if child is inside parent
 */
export function isRangeSubrangeOf(
	child: [number, number],
	parent: [number, number],
) {
	return child[0] >= parent[0] && child[1] <= parent[1];
}

/**
 * Iterate over the syntax tree in the visible ranges of the document
 * @param view - Editor view
 * @param iterateFns - Object with `enter` and `leave` iterate function
 */
export function iterateTreeVisibleRanges(
	view: EditorView,
	iterateFns: {
		enter: (node: SyntaxNodeRef) => boolean | void;
		leave?: (node: SyntaxNodeRef) => void;
	}
) {
	for (const { from, to } of view.visibleRanges) {
		syntaxTree(view.state).iterate({ ...iterateFns, from, to });
	}
}

/**
 * Returns the lines of the editor that are in the given range and not folded.
 * This function is of use when you need to get the lines of a particular
 * block node and add line decorations to each line of it.
 *
 * @param view - Editor view
 * @param from - Start of the range
 * @param to - End of the range
 * @returns A list of line blocks that are in the range
 */
export function editorLines(view: EditorView, from: number, to: number) {
	let lines = view.viewportLineBlocks.filter((block) =>
		// Keep lines that are in the range
		isRangesOverlap([block.from, block.to], [from, to])
	);

	const folded = foldedRanges(view.state).iter();
	while (folded.value) {
		lines = lines.filter(
			(line) =>
				!isRangesOverlap(
					[folded.from, folded.to],
					[line.from, line.to]
				)
		);
		folded.next();
	}

	return lines;
}

/**
 * Returns the lines of the editor that are in the given range and not folded.
 * This function is of use when you need to get the lines of a particular
 * block node and add line decorations to each line of it.
 *
 * @param view - Editor view
 * @param from - Start of the range
 * @param to - End of the range
 * @returns A list of line blocks that are in the range
 */
export function getVisibleEditorLines(view: EditorView, from: number, to: number) {
	let lines = view.viewportLineBlocks.filter((block) =>
		// Keep lines that are in the range
		isRangesOverlap([block.from, block.to], [from, to])
	);

	const folded = foldedRanges(view.state).iter();
	while (folded.value) {
		lines = lines.filter(
			(line) =>
				!isRangeSubrangeOf(
					[line.from, line.to],
					[folded.from, folded.to],
				)
		);
		folded.next();
	}

	return lines;
}

/**
 * Check if the given range is inside a folded range.
 * @param view - Editor view
 * @param from - Start of the range
 * @param to - End of the range
 * @returns True if the range is inside a folded range
 */
export function isInFoldedRange(state: EditorState, from: number, to: number): boolean {
	const folded = foldedRanges(state).iter();
	while (folded.value) {
		if (isRangesOverlap(
			[folded.from, folded.to],
			[from, to]
		)) return true;
		folded.next();
	}
	return false;
}
