import { buildParser } from "@lezer/generator";
// import { } "../../../node_modules/@lezer/generator/dist/rollup-plugin-lezer"
import grammarSource from './calculus-language.grammar?raw';
import { createUnitTokenizer } from './calculus-number-with-unit-tokens';


export const calculusParser = buildParser(grammarSource, {
	moduleStyle: 'es',
	fileName: 'calculus.build',
	externalTokenizer(name, terms) {
		if (name !== 'numberWithUnitTokens') {
			throw new Error(`Unexpected external tokenizer: ${name}`);
		}
		return createUnitTokenizer({ Unit: terms.Unit });
	},
})