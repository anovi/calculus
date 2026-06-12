/* Imports of @codemirror plugins */
import {
	keymap,
	highlightSpecialChars,
	dropCursor,
	highlightActiveLineGutter,
	EditorView
} from "@codemirror/view"
import { type Extension } from "@codemirror/state"
import {
	defaultHighlightStyle,
	syntaxHighlighting,
	foldKeymap,
	bracketMatching
} from "@codemirror/language"
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands"
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search"
import {
	completionKeymap,
	closeBrackets,
	closeBracketsKeymap,
} from "@codemirror/autocomplete"
import { lintKeymap } from "@codemirror/lint"
import { renameVariableReferencesHistoryConfig } from "./variables/rename-variable-references"

/**
 * Basic codemirror plugins.
 *
 * The repository: https://github.com/codemirror/basic-setup/tree/main
 */
export const basicSetup: () => Extension = () => [
	// https://codemirror.net/docs/ref/#view.lineNumbers
	// lineNumbers(),

	// https://codemirror.net/docs/ref/#view.highlightSpecialChars
	highlightSpecialChars(),

	// https://codemirror.net/docs/ref/#commands.history
	history(renameVariableReferencesHistoryConfig),

	// https://codemirror.net/docs/ref/#language.foldGutter
	// foldGutter(),

	// https://codemirror.net/docs/ref/#view.drawSelection
	// drawSelection(),

	// https://codemirror.net/docs/ref/#view.dropCursor
	dropCursor(),

	// https://codemirror.net/docs/ref/#state.EditorState%5EallowMultipleSelections
	// EditorState.allowMultipleSelections.of(true),

	// https://codemirror.net/docs/ref/#language.indentOnInput
	// indentOnInput(),

	// https://codemirror.net/docs/ref/#language.defaultHighlightStyle
	syntaxHighlighting(defaultHighlightStyle, { fallback: true }),

	// https://codemirror.net/docs/ref/#language.bracketMatching
	bracketMatching(),

	// https://codemirror.net/docs/ref/#autocomplete.closeBrackets
	closeBrackets(),

	// Autocompletion is provided by unitAutocompletion() (single autocompletion() instance).
	// https://codemirror.net/docs/ref/#autocomplete.autocompletion
	// autocompletion({
	// 	maxRenderedOptions: 20,
	// }),

	// https://codemirror.net/docs/ref/#view.rectangularSelection
	// rectangularSelection(),

	// https://codemirror.net/docs/ref/#view.crosshairCursor
	// crosshairCursor(),

	// https://codemirror.net/docs/ref/#view.highlightActiveLine
	// highlightActiveLine(),

	// https://codemirror.net/docs/ref/#view.highlightActiveLineGutter
	highlightActiveLineGutter(),

	// https://codemirror.net/docs/ref/#search.highlightSelectionMatches
	highlightSelectionMatches(),

	EditorView.lineWrapping,

	keymap.of([
		...closeBracketsKeymap,
		...defaultKeymap, // when removed, jumping over widgets is broken
		...searchKeymap,
		...historyKeymap,
		...foldKeymap,
		...completionKeymap,
		...lintKeymap
	])
]
