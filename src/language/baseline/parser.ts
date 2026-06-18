import { buildParser } from "@lezer/generator";
import grammarSource from './compio-language.grammar?raw';
import { createIdentifierTokensTokenizer } from './compio-identifier-tokens';
import { createNumberWithUnitTokensTokenizer } from './compio-number-with-unit-tokens';


export const compioParser = buildParser(grammarSource, {
	moduleStyle: 'es',
	fileName: 'compio.build',
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