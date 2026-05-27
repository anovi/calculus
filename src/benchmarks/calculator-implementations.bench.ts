import { bench, describe } from 'vitest';

import { parser } from '../language/baseline/calculus-language';
import { MathCalculator as CalculatorCurrent } from '../calculator/calculator';
import { MathCalculator as CalculatorAfterRefactoring } from '../calculator/calculator-after-refactoring';
import { MathCalculator as CalculatorBeforeRefactoring } from '../calculator/calculator-before-refactoring';
import { calculatorFixtures, createMockRatesStore } from '../calculator/calculator.spec.fixtures';

type SliceDoc = (from: number, to?: number) => string;

type CalculatorLike = {
	assemble: (cursor: ReturnType<ReturnType<typeof parser.parse>['cursor']>) => unknown;
};

type Implementation = {
	name: string;
	create: (sliceDoc: SliceDoc, doc: string) => CalculatorLike;
};

const implementations: Implementation[] = [
	{
		name: 'calculator.ts',
		create: (sliceDoc, doc) =>
			new CalculatorCurrent(sliceDoc, createMockRatesStore(), doc),
	},
	{
		name: 'calculator-after-refactoring.ts',
		create: (sliceDoc, doc) =>
			new CalculatorAfterRefactoring(sliceDoc, createMockRatesStore(), doc),
	},
	{
		name: 'calculator-before-refactoring.ts',
		// This implementation does not need the third `doc` constructor argument.
		create: (sliceDoc) =>
			new CalculatorBeforeRefactoring(sliceDoc, createMockRatesStore()),
	},
];

const benchmarkFixtures = calculatorFixtures.filter((fx) => !fx.skip);

function runFixture(implementation: Implementation, doc: string) {
	const tree = parser.parse(doc);
	const cursor = tree.cursor();
	const sliceDoc: SliceDoc = (from, to) => doc.slice(from, to);
	const calculator = implementation.create(sliceDoc, doc);
	calculator.assemble(cursor);
}

describe('calculator implementations (spec fixtures)', () => {
	for (const implementation of implementations) {
		bench(implementation.name, () => {
			for (const fixture of benchmarkFixtures) {
				runFixture(implementation, fixture.doc);
			}
		});
	}
});
