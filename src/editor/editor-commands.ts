import { syntaxTree } from '@codemirror/language';
import { type SyntaxNode } from '@lezer/common'
import { type TransactionSpec, EditorState, Transaction, EditorSelection, ChangeSet } from "@codemirror/state";



export type Format = {
	open: string;
	close?: string;
	block: boolean;
	nodeName?: string;
	noUnwrap?: boolean;
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
	let wrap = false;
	const tree = syntaxTree(state);

	// Check each selection for formatted ranges of same type
	for (const selection of selections) {
		let from = selection.from;
		let to = selection.to;
		// if (from === to) {
		// 	break;
		// }
		if (!format.noUnwrap) tree.iterate({
			enter: (nodeRef) => {
				if (nodeRef.type.name === format.nodeName) {
					// Formatted range equal or within the selection
					if (from >= nodeRef.from && to <= nodeRef.to) {
						toUnwrap.push(nodeRef.node);
					}
					// Formatted range out of boundaries of selection
					else if (from < nodeRef.from || to > nodeRef.to) {
						toUnwrap.push(nodeRef.node);
						// expand applicable range
						from = Math.min(from, nodeRef.from);
						to = Math.max(to, nodeRef.to);
						wrap = true;
					}
				}
			},
			from,
			to,
		})
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

        // debugger
        if (toUnwrap.length === 0) {
			for (let i = 0; i < applyRanges.length/2 ; i = i + 2) {
				const from = applyRanges[i];
				const to = applyRanges[i+1];
                if (wrap && from !== to) {
					const spec: TransactionSpec = {
                        changes: [
                            { from: from, insert: format.open },
							{ from: to, insert: format.close },
                        ]
                    };
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
                } else if (!wrap) {
                    const pos = skipWhiteSpaceBackward(state, from)
                    console.log(pos,from)
                    const spec: TransactionSpec = {
                        changes: [
                            { from: from, insert: pos === from ? ` ${format.open} ` : format.open },
                        ]
                    };
                    transactionSpecs.push(spec);

                    const changeDesc = ChangeSet.of(spec.changes!, state.doc.length).desc;
                    const anchor = changeDesc.mapPos(from, 1); // position of "world" after changes
                    const head = changeDesc.mapPos(to, 1);

					// Handle selection after format is applied
					if (format.selection) {
						const initial = state.sliceDoc(from, to);
						if (typeof format.selection === "function") {
							const s = format.selection(initial, anchor, head);
							spec.selection = EditorSelection.range(s.from, s.to)
						}
					} else {
                        spec.selection = EditorSelection.range(anchor, head);
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

function skipWhiteSpaceBackward(state: EditorState, from: number) {
    let point = from;
    while (point > 0) {
        const textBeforeSelection = state.sliceDoc(point - 1, from);
        if (!textBeforeSelection.match(WHITESPACE_EXCEPT_NEWLINE)) break;
        point--;
    }
    return point;
}