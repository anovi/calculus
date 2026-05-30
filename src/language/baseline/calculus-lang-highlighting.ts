import { styleTags, Tag, tags } from "@lezer/highlight"
import * as terms from './calculus-language.terms'

export type TermKey = keyof typeof terms;
export type TermValue = typeof terms[keyof typeof terms];

export const calculusLangHighlight = styleTags({
	//@ts-ignore
	'FunctionCall/Identifier': tags.function(tags.name),
	'Identifier': tags.variableName,
	'TimesBinaryOp': tags.operator,
	'PowBinaryOp': tags.operator,
	'PlusBinaryOp': tags.operator,
	'Number': tags.number,
	'String': tags.string,
	'Date': tags.literal,
	'Comment': tags.comment,
	'Unit': tags.unit,
	'Cpr': tags.paren,
	'Opr': tags.paren,
} satisfies Partial<Record<TermKey, Tag | readonly Tag[]>>)

