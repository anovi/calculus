import assert from 'node:assert'
import { EditorSelection, EditorState } from '@codemirror/state'
import { EditorView } from '@codemirror/view'

import { parser } from '../language'
import { LRLanguage } from '@codemirror/language'
import { calcRanges } from './values-field'
import { calcClipboard } from './calc-clipboard'

const calcLanguage = LRLanguage.define({ name: 'calculus', parser });

function filterCopy(doc: string, selectionText?: string): string {
    const selected = selectionText ?? doc;
    const from = doc.indexOf(selected);
    const to = from === -1 ? doc.length : from + selected.length;
    const state = EditorState.create({
        doc,
        selection: EditorSelection.range(from === -1 ? 0 : from, to),
        extensions: [calcLanguage, calcRanges(), calcClipboard()],
    });
    const text = selected;
    const filters = state.facet(EditorView.clipboardOutputFilter);
    return filters.reduce((t, f) => f(t, state), text);
}

function filterPaste(doc: string, pasted: string): string {
    const state = EditorState.create({
        doc,
        extensions: [calcLanguage, calcRanges(), calcClipboard()],
    })
    const filters = state.facet(EditorView.clipboardInputFilter)
    return filters.reduce((t, f) => f(t, state), pasted)
}

describe('calcClipboard', () => {
    it('appends result when copying an expression line', () => {
        assert.strictEqual(filterCopy('23 + 3'), '23 + 3 = 26')
        assert.strictEqual(filterCopy('2^4'), '2^4 = 16')
    })
    
    it('does not append result for named bindings', () => {
        assert.strictEqual(filterCopy('tax_rate = 0.21'), 'tax_rate = 0.21')
    })
    
    it('append result for expression with named bindings', () => {
        assert.strictEqual(
            filterCopy('tax_rate = 0.21\nnet = 100\n gross = net + net * tax_rate'),
            'tax_rate = 0.21\nnet = 100\n gross = net + net * tax_rate = 121'
        )
    })
    
    it('appends result when copied line has leading spaces', () => {
        assert.strictEqual(filterCopy('  23 + 3'), '  23 + 3 = 26')
    })
    
    it('strips a trailing result when pasting', () => {
        assert.strictEqual(filterPaste('', '2^4 = 16'), '2^4')
        assert.strictEqual(filterPaste('', '23 + 3 = 26'), '23 + 3')
    })
    
    it('strips only when the suffix matches the computed result', () => {
        assert.strictEqual(filterPaste('', 'tax_rate = 0.21'), 'tax_rate = 0.21')
        assert.strictEqual(filterPaste('', '23 + 3 = 99'), '23 + 3 = 99')
    })
    
    it('strips result for expression with named bindings', () => {
        const doc = 'tax_rate = 0.21\nnet = 100\n gross = net + net * tax_rate'
        const pasted = 'tax_rate = 0.21\nnet = 100\n gross = net + net * tax_rate = 121'
        assert.strictEqual(filterPaste(doc, pasted), doc)
    })

    it('strips results for multi-line pasted dependencies', () => {
        const pasted = 'rate = 5 / 9 = 0.555556\nvinegar = 300 + rate = 300.555556'
        const expected = 'rate = 5 / 9\nvinegar = 300 + rate'
        assert.strictEqual(filterPaste('', pasted), expected)
    })
    
    it('round-trips expression lines', () => {
        const copied = filterCopy('2^4')
        assert.strictEqual(filterPaste('', copied), '2^4')
    })

})
