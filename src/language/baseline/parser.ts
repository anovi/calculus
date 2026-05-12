import { buildParser } from "@lezer/generator";
import grammarSource from './calculus-language.grammar?raw';
import { createNumberWithUnitTokenizer } from './calculus-number-with-unit-tokens';


export const calculusParser = buildParser(grammarSource, {
	moduleStyle: 'es',
	fileName: 'calculus.build',
	externalTokenizer(name, terms) {
		if (name !== 'numberWithUnitTokens') {
			throw new Error(`Unexpected external tokenizer: ${name}`);
		}
		return createNumberWithUnitTokenizer(terms.NumberWithUnit);
	},
})