import { buildParser } from "@lezer/generator";
import grammarSource from './calculus-language.grammar?raw';


export const calculusParser = buildParser(grammarSource, {
	moduleStyle: 'es',
	fileName: 'calculus.build',
})