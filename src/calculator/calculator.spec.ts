import assert from 'node:assert';
import { buildParser } from "@lezer/generator";
import { Tree } from "@lezer/common"
import { Range } from "@codemirror/state";
import Decimal from 'decimal.js';

import grammarSource from '../language/baseline/calculus-language.grammar?raw';
import { createUnitTokenizer } from '../language/baseline/calculus-number-with-unit-tokens';
import { CalcValue, MathCalculator } from './calculator';
import {
    calculatorFixtures,
    createMockRatesStore,
    isCalculatorExpectedError,
    type CalculatorExpectedRow,
} from './calculator.spec.fixtures';
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

function assertExpected(values: Range<CalcValue>[], assertions: CalculatorExpectedRow[]) {
    if (!values || values.length !== assertions.length) {
        throw Error('Values and assertions must be equal length!');
    }
    for (let index = 0; index < values.length; index++) {
        const row = values[index].value;
        const expected = assertions[index];

        if (isCalculatorExpectedError(expected)) {
            assert.ok(row.result.isNaN(), `Row ${index}: expected error, got ${row.result}`);
            assert.strictEqual(row.error, expected.error, `Row ${index}: error message`);
            if (expected.unitChoices !== undefined) {
                assert.deepStrictEqual(
                    row.unitChoices,
                    expected.unitChoices,
                    `Row ${index}: unitChoices`,
                );
            }
            assert.ok(row.errorFrom != null && row.errorTo != null, `Row ${index}: error range`);
            continue;
        }

        const actual = row.result;
        const expectedDecimal = new Decimal(expected);
        const match = (actual.isNaN() && expectedDecimal.isNaN()) || actual.eq(expectedDecimal);
        assert.ok(
            match,
            `Row ${index}: expected ${expectedDecimal.toString()}, got ${actual.toString()}`
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
    const sliceDoc = (from: number, to?: number) => doc.slice(from, to);

	for (const fx of calculatorFixtures) {
        const test = fx.only ? it.only : fx.skip ? it.skip : it;
        test(fx.name, () => {
            doc = fx.doc;
            const result = parser.parse(doc);
            printTree(result)
            const cursor = result.cursor();
            const calculator = new MathCalculator(sliceDoc, createMockRatesStore(), doc);
            const res = calculator.assemble(cursor);

            try {
                assert.ok(result instanceof Tree);
                assert.ok(res)
                assertExpected(res, fx.expected)
                if (fx.expectedUnits) assertUnits(res, fx.expectedUnits)
            } catch (error) {
                printTree(result);
                console.log('Result values:', res);
                throw error;
            }
        });
    }
})
