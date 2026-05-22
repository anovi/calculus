import assert from 'node:assert';
import { EditorState } from '@codemirror/state';

import { OperationsDictionary } from './operations-dictionary';
import { toggleInlineFormat } from './editor-commands';

describe('OperationsDictionary exponent', () => {
	it('inserts ^2 with caret before exponent', () => {
		const state = EditorState.create({ doc: '', selection: { anchor: 0 } });
		const format = OperationsDictionary.exponent.insert!;
		const result = toggleInlineFormat(state, format);
		assert.ok(result.ok);
		assert.strictEqual(result.value.state.doc.toString(), '^2');
		const range = result.value.state.selection.main;
		assert.strictEqual(range.from, 2);
		assert.strictEqual(range.to, 2);
	});
});
