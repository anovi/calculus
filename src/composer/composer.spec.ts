import assert from 'node:assert';
import { buildParser } from "@lezer/generator";
import { Tree } from "@lezer/common"
import { Range } from "@codemirror/state";

import grammarSource from '../language/calculus-language.grammar?raw';
import { CalcValue, MathComposer } from './composer';
import { printTree } from '../lib/tree';

const parser = buildParser(grammarSource, {
	moduleStyle: 'es',
	fileName: 'calculus.build'
})

function assertValues(values: Range<CalcValue>[], assertions: number[]) {
    if (!values || values.length !== assertions.length) throw Error('Values and assertions must be equal length!');
    for (let index = 0; index < values.length; index++) {
        assert.equal(values[index].value.result, assertions[index]);
    }
}

describe('CalcDoc grammar', () => {

    let doc = '2+2';
    const sliceDoc = (from: number, to: number) => doc.slice(from, to);

	it('builds value', () => {
        const result = parser.parse(doc);
        assert.ok(result instanceof Tree);
        printTree(result)
        const cursor = result.cursor();
        const composer = new MathComposer(sliceDoc);
        const res = composer.assemble(cursor);
        assert.ok(res)
        console.log(res)
        assertValues(res, [4])
    });
})
