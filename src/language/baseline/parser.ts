import { buildParser } from "@lezer/generator";
import grammarSource from './calculus-language.grammar?raw';
import { createIdentifierTokensTokenizer } from './calculus-identifier-tokens';
import { createNumberWithUnitTokensTokenizer } from './calculus-number-with-unit-tokens';


export const calculusParser = buildParser(grammarSource, {
	moduleStyle: 'es',
	fileName: 'calculus.build',
	externalTokenizer(name, terms) {
		if (name === 'numberWithUnitTokens') {
			return createNumberWithUnitTokensTokenizer({
				Unit: terms.Unit,
				PercentSuffix: terms.PercentSuffix,
			});
		}
		if (name === 'identifierTokens') {
			return createIdentifierTokensTokenizer({
				Identifier: terms.Identifier,
			});
		}
		throw new Error(`Unexpected external tokenizer: ${name}`);
	},
})