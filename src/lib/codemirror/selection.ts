import { EditorSelection, EditorState, Transaction } from "@codemirror/state";
import type { SyntaxNode } from '@lezer/common';
import { ViewUpdate } from "@codemirror/view";

import { isRangesOverlap } from "./range"; 


/**
 * Check if any of the editor cursors is in the given range
 * @param state - Editor state
 * @param range - Range to check
 * @returns True if the cursor is in the range
 */
export function isCursorInRange(state: EditorState, from: number, to: number) {
	return state.selection.ranges.some((selection) =>
		isRangesOverlap(from, to, selection.from, selection.to)
	);
}


/**
 * Tells if selection position is changed in a given transaction.
 *
 * Does not return `true` when editor just losts the selection
 * or gets it on the same position as before.
 */
export function isTransactionChangedSelectionPos(tr: Transaction): boolean {
	return (tr.startState.selection === undefined && tr.newSelection !== undefined)
		|| (tr.startState.selection !== undefined && !tr.newSelection.eq(tr.startState.selection));
}

/**
 * Returnes true if the cursor have just been moved into a given node.
 * 
 * For examle, cursor was out of node's range, and user moved selection into node's range:
 * ```text
 * ╔═══════════════════════╗
 * ║ n o d e ·|· ·         ║         
 * ║          ^cursor      ║
 * ║═══════════════════════║
 * ║ n o d e|· · ·         ║
 * ║        ^cursor        ║
 * ╚═══════════════════════╝
 * ```
 */
export function didAtomicCursorEnterTheNode(node: SyntaxNode, update: ViewUpdate): boolean {
	return (
		!update.docChanged
		&& // it is atomic range selection
		update.state.selection.ranges.length === 1 && update.startState.selection.ranges.length === 1
		&& // it was atomic range selection
		update.startState.selection.main.from === update.startState.selection.main.to
		&& // was not in the Node's range
		!isRangesOverlap(
			update.startState.selection.main.from, update.startState.selection.main.to,
			node.from, node.to,
		)
		&& // cursor was moved by one char
		Math.abs(update.startState.selection.main.from - update.state.selection.main.from) === 1
	);
}

export function isAtomicSelection(selection: EditorSelection) {
	return selection.main.anchor === selection.main.head;
}
