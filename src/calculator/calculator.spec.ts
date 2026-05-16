import assert from 'node:assert';
import { buildParser } from "@lezer/generator";
import { Tree } from "@lezer/common"
import { Range } from "@codemirror/state";
import Decimal from 'decimal.js';

import grammarSource from '../language/baseline/calculus-language.grammar?raw';
import { createUnitTokenizer } from '../language/baseline/calculus-number-with-unit-tokens';
import { CalcValue, MathCalculator } from './calculator';
import { calculatorFixtures, createMockRatesStore } from './calculator.spec.fixtures';
import { printTree } from '../lib/tree';

const parser = buildParser(grammarSource, {
	moduleStyle: 'es',
	fileName: 'calculus.build',
	externalTokenizer(name, terms) {
		if (name !== 'numberWithUnitTokens') {
			throw new Error(`Unexpected external tokenizer: ${name}`);
		}
		return createUnitTokenizer({ Unit: terms.Unit });
	},
})

function assertValues(values: Range<CalcValue>[], assertions: (number | string)[]) {
    if (!values || values.length !== assertions.length) throw Error('Values and assertions must be equal length!');
    for (let index = 0; index < values.length; index++) {
        const actual = values[index].value.result;
        const expected = new Decimal(assertions[index]);
        assert.ok(
            actual.eq(expected),
            `Row ${index}: expected ${expected.toString()}, got ${actual.toString()}`
        );
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

	for (const fx of calculatorFixtures) {
        const test = fx.only ? it.only : fx.skip ? it.skip : it;
        test(fx.name, () => {
            doc = fx.doc;
            const result = parser.parse(doc);
            const cursor = result.cursor();
            const calculator = new MathCalculator(sliceDoc, createMockRatesStore());
            const res = calculator.assemble(cursor);

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
