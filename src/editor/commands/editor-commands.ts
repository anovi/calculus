import { type SyntaxNode, Tree } from '@lezer/common'
import { type TransactionSpec, EditorState, Transaction, EditorSelection, ChangeSet, type ChangeSpec } from "@codemirror/state";

import { terms } from '../../language';



export type Format = {
	open: string;
	close?: string;
	block: boolean;
	nodeName?: string;
	// noUnwrap?: boolean;
	exclusiveGroup?: string;
	/**
	 * Optionally specify how to move the selection after applying the format.
	 * Takes function as argument where:
	 * - {text} is a initial text
	 * - {from} is initial start position mapped through changes
	 * _ {to} is inital and position mapped through changes
	 */
	selection?: (text: string, from: number, to: number) => { from: number, to: number };
};

type CommandResult =  { ok: true, value: Transaction } | { ok: false, reason?: string }

/**
 * Toggles inline formatting: adds tags if not present, removes if present.
 */
/**
 * Enhanced toggleInlineFormat:
 * - If selection is fully wrapped, unwraps as before.
 * - If not, removes all inner tags from selection, then wraps the cleaned selection.
 * - Handles multiple selections.
 */
export function toggleInlineFormat(
    state: EditorState,
	format: Format
): CommandResult {
    const selections = state.selection.ranges;
    if (!selections.length) return { ok: false, reason: 'No selection found'};

	const close = format.close ?? format.open;
	// Ranges to apply in a format of pairs of numbers, like [24, 32, 56, 32].
	// Each pair represents a range to which changes will be applied.
	const applyRanges: number[] = [];
	const toUnwrap: SyntaxNode[] = [];

	// Check each selection for formatted ranges of same type
	for (const selection of selections) {
		let from = selection.from;
		let to = selection.to;
		applyRanges.push(from, to);
	}

    const transactionSpecs: TransactionSpec[] = [];
	const selectionRanges: { from: number, to: number }[] = [];
    try {
		// Remove tags (unwrap)
		for (const range of toUnwrap) {
			const from = range.from;
			const to = range.to;
			transactionSpecs.push({
				changes: [
					{ from: from, to: from + format.open.length },
					{ from: to - close.length, to }
				]
			});
		}

        if (toUnwrap.length === 0) {
			for (let i = 0; i < applyRanges.length/2 ; i = i + 2) {
				const from = applyRanges[i];
				const to = applyRanges[i+1];
                const spec: TransactionSpec = {
					changes: [
						{ from: from, insert: format.open },
					]
				};
				if (format.close) (spec.changes as ChangeSpec[]).push({ from: to, insert: format.close });
				transactionSpecs.push(spec);

				// Handle selection after format is applied
				if (format.selection) {
					const initial = state.sliceDoc(from, to);
					
					const changeDesc = ChangeSet.of(spec.changes!, state.doc.length).desc;
					const anchor = changeDesc.mapPos(from); // position of "world" after changes
					const head = changeDesc.mapPos(to);

					if (typeof format.selection === "function") {
						const s = format.selection(initial, anchor, head);
						spec.selection = EditorSelection.range(s.from, s.to)
					}
				}
            }
        }
    } catch (error) {
        console.error(error);
        return { ok: false, reason: (error as Error).message};
    }
	if (selectionRanges.length) {
		transactionSpecs.push({
			selection: EditorSelection.create(
				selectionRanges.map(r => EditorSelection.range(r.from, r.to))
			)
		});
	}

	const tr = state.update(...transactionSpecs);
	return {ok: true, value: tr};
}

const WHITESPACE_EXCEPT_NEWLINE = /^[^\S\r\n]+$/

export function skipWhiteSpaceBackward(state: EditorState, from: number) {
    let point = from;
    while (point > 0) {
        const textBeforeSelection = state.sliceDoc(point - 1, from);
        if (!textBeforeSelection.match(WHITESPACE_EXCEPT_NEWLINE)) break;
        point--;
    }
    return point;
}

export function formatCurrentLine(state: EditorState): void {
	const selection = state.selection.main;
	if (!selection) return;
	const line = state.doc.lineAt(selection.anchor);
	if (!line) return;
	line.text
}

export function formatTextLine(
	tree: Tree,
	from: number,
	to: number,
): ChangeSpec[] {
	const gaps: number[] = [];
	let prevEnd = -1;
	let prevId = -1;

	tree.iterate({
		from,
		to,
		enter: (nodeRef) => {
			const id = nodeRef.type.id;
			if (!participatesInSpacing(id)) return;

			if (prevEnd === nodeRef.from && shouldInsertSpace(prevId, id)) {
				gaps.push(prevEnd);
			}
			prevEnd = nodeRef.to;
			prevId = id;
		},
	});

	if (!gaps.length) return [];

	gaps.sort((a, b) => a - b);
	return gaps.map((pos) => ({ from: pos, insert: ' ' }));
}

/** Apply format changes to a document. */
export function applyFormatSpecs(state: EditorState, changes: ChangeSpec[]): EditorState {
	if (!changes.length) return state;
	return state.update({ changes }).state;
}

function isAtomicNode(id: number): boolean {
	switch (id) {
		case terms.Identifier:
		case terms.Number:
		case terms.Unit:
		case terms.EqualSign:
		case terms.PlusBinaryOp:
		case terms.TimesBinaryOp:
		case terms.PowBinaryOp:
		case terms.ConvertOp:
			return true
		default:
			return false
	}
}

function participatesInSpacing(id: number): boolean {
	return isAtomicNode(id) || id === terms.Opr || id === terms.Cpr;
}

/** Parentheses are not spaced; exponent operands stay tight (`2^2`). */
function shouldInsertSpace(prevId: number, currentId: number): boolean {
	if (currentId === terms.Opr || currentId === terms.Cpr) return false;
	if (prevId === terms.Opr) return false;
	if (currentId === terms.Cpr) return false;
	if (prevId === terms.PowBinaryOp || currentId === terms.PowBinaryOp) return false;
	return true;
}