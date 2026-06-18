import { tags } from "@lezer/highlight"
import { HighlightStyle } from "@codemirror/language"

export const compioHighlightStyle = HighlightStyle.define([
	{ tag: tags.function(tags.name), color: 'var(--editor-function)' },
	{ tag: tags.variableName, color: 'var(--editor-variable)' },
	{ tag: tags.operator, color: 'var(--editor-operator)' },
	{ tag: tags.number, color: 'var(--editor-number)' },
	{ tag: tags.string, color: 'var(--editor-function)' },
	{ tag: tags.literal, color: 'var(--editor-number)' },
	{ tag: tags.bracket, color: 'var(--editor-parenthesis-lvl1)' },
	{ tag: tags.paren, color: 'var(--editor-parenthesis-lvl1)' },
	{ tag: tags.comment, color: 'var(--editor-comment)' },
	{ tag: tags.unit, color: 'var(--editor-unit)' },
	{ tag: tags.heading, color: 'var(--editor-base)', fontWeight: 600 },
])
