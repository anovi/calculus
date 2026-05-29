import { tags } from "@lezer/highlight"
import { HighlightStyle } from "@codemirror/language"

export const calculusHighlightStyle = HighlightStyle.define([
	{ tag: tags.variableName, color: 'var(--cm-hl-variable)' },
	{ tag: tags.operator, color: 'var(--cm-hl-operator)' },
	{ tag: tags.number, color: 'var(--cm-hl-number)' },
	{ tag: tags.string, color: 'var(--cm-hl-string)' },
	{ tag: tags.literal, color: 'var(--cm-hl-literal)' },
	{ tag: tags.bool, color: 'var(--cm-hl-bool)' },
	{ tag: tags.bracket, color: 'var(--cm-hl-bracket)' },
	{ tag: tags.logicOperator, color: 'var(--cm-hl-logic)' },
	{ tag: tags.typeName, color: 'var(--cm-hl-type)' },
	{ tag: tags.comment, color: 'var(--cm-hl-comment)' },
	{ tag: tags.unit, color: 'var(--cm-hl-unit)' },
])
