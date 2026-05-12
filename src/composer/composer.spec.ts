import assert from 'node:assert';
import { buildParser } from "@lezer/generator";
import { Tree } from "@lezer/common"
import { Range } from "@codemirror/state";

import grammarSource from '../language/baseline/calculus-language.grammar?raw';
import { createNumberWithUnitTokenizer } from '../language/baseline/calculus-number-with-unit-tokens';
import { CalcValue, MathComposer } from './composer';
import { composerFixtures } from './composer.spec.fixtures';
import { printTree } from '../lib/tree';

const parser = buildParser(grammarSource, {
	moduleStyle: 'es',
	fileName: 'calculus.build',
	externalTokenizer(name, terms) {
		if (name !== 'numberWithUnitTokens') {
			throw new Error(`Unexpected external tokenizer: ${name}`);
		}
		return createNumberWithUnitTokenizer({
			NumberWithUnit: terms.NumberWithUnit,
			Unit: terms.Unit,
		});
	},
})

function assertValues(values: Range<CalcValue>[], assertions: number[]) {
    if (!values || values.length !== assertions.length) throw Error('Values and assertions must be equal length!');
    for (let index = 0; index < values.length; index++) {
        assert.equal(values[index].value.result, assertions[index]);
    }
}

function assertUnits(values: Range<CalcValue>[], expected: (string | undefined)[]) {
    if (!values || values.length !== expected.length) throw Error('Values and expected units must be equal length!');
    for (let index = 0; index < values.length; index++) {
        assert.equal(values[index].value.unit, expected[index]);
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
                if (fx.expectedUnits) assertUnits(res, fx.expectedUnits)
            } catch (error) {
                printTree(result);
                console.log(res);
                throw error;
            }
        });
    }
})
