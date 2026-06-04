import {
	Annotation,
	ChangeSet,
	EditorState,
	Transaction,
	type Extension,
	type TransactionSpec,
} from '@codemirror/state';
import { syntaxTree } from '@codemirror/language';

import { isMobileDevice } from '../../lib/mobile-device';
import { formatTextLine } from '../editor-commands';

/** Marks transactions produced by format-on-type so filters do not recurse. */
const formatOnTypeAnnotation = Annotation.define<boolean>();

function linesTouchedByChanges(tr: Transaction): number[] {
	const lines = new Set<number>();
	tr.changes.iterChanges((_fromA, _toA, fromB, _toB, inserted) => {
		if (inserted.length <= 0) return;
		const endB = fromB + inserted.length;
		const start = tr.newDoc.lineAt(fromB).number;
		const end = tr.newDoc.lineAt(Math.max(fromB, endB - 1)).number;
		for (let n = start; n <= end; n++) lines.add(n);
	});
	return [...lines];
}

function formatOnTypeFilter(tr: Transaction): TransactionSpec | readonly TransactionSpec[] {
	if (!tr.docChanged) return tr;
	if (tr.annotation(formatOnTypeAnnotation)) return tr;
	if (!isMobileDevice()) return tr;
	if (tr.isUserEvent('input.paste')) return tr;
	if (!tr.isUserEvent('input') && !tr.isUserEvent('delete')) return tr;

	const lineNumbers = linesTouchedByChanges(tr);
	if (lineNumbers.length <= 0) return tr;

	const state = tr.state;
	const tree = syntaxTree(state);
	const changes: NonNullable<TransactionSpec['changes']>[] = [];
	const docLength = state.doc.length;

	for (const lineNumber of lineNumbers) {
		const line = state.doc.line(lineNumber);
		const specs = formatTextLine(tree, line.from, line.to);
		if (!specs.length) continue;
		changes.push(...specs);
	}

	if (changes.length === 0) return tr;

	const changeSet = ChangeSet.of(changes, docLength);
	const combinedChangeSet = tr.changes.compose(changeSet);

	const annotations = (tr as Transaction & { annotations: Annotation<any>[] }).annotations;
	return {
		changes: combinedChangeSet,
		selection: tr.selection!.map(changeSet),
		scrollIntoView: tr.scrollIntoView,
		effects: tr.effects,
		annotations: [...annotations, formatOnTypeAnnotation.of(true)],
	};
}

/** Formats a line on typing (not paste) on mobile devices. */
export function formatOnType(): Extension {
	return EditorState.transactionFilter.of(formatOnTypeFilter);
}
