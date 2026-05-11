import assert from 'node:assert';
import { buildParser } from "@lezer/generator";
import { Tree } from "@lezer/common"
import { Range } from "@codemirror/state";

import grammarSource from '../language/calculus-language.grammar?raw';
import { CalcValue, MathComposer } from './composer';
import { composerFixtures } from './composer.spec.fixtures';
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

    let doc = '';
    const sliceDoc = (from: number, to: number) => doc.slice(from, to);

	for (const fx of composerFixtures) {
        const test = fx.only ? it.only : fx.skip ? it.skip : it;
        test(fx.name, () => {
            doc = fx.doc;
            const result = parser.parse(doc);
            const cursor = result.cursor();
            const composer = new MathComposer(sliceDoc);
            const res = composer.assemble(cursor);

            try {
                assert.ok(result instanceof Tree);
                assert.ok(res)
                assertValues(res, fx.expected)
            } catch (error) {
                printTree(result);
                console.log(res);
                throw error;
            }
        });
    }
})
