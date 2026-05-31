import { Compartment, type Extension } from '@codemirror/state'
import { EditorView } from 'codemirror'

const autocompleteTheme = EditorView.baseTheme({
    "& .cm-tooltip-autocomplete > ul": {
        fontFamily: "inherit",
    },
    "& .cm-tooltip-autocomplete > ul > li[aria-selected]": {
        backgroundColor: "var(--autocomplete-selected-bg)",
        color: "var(--autocomplete-selected-fg)",
    },
    "& .cm-tooltip-autocomplete-disabled > ul > li[aria-selected]": {
        backgroundColor: "var(--autocomplete-disabled-selected-bg)",
        color: "var(--autocomplete-fg)",
    },
    "& .cm-tooltip-autocomplete > ul > completion-section": {
        borderBottomColor: "var(--autocomplete-border)",
        color: "var(--autocomplete-detail-fg)",
    },
    "& .cm-completionMatchedText": {
        color: "var(--autocomplete-matched-fg)",
        textDecorationColor: "var(--autocomplete-matched-fg)",
    },
    "& .cm-completionDetail": {
        color: "var(--autocomplete-detail-fg)",
    },
    "& .cm-completionIcon": {
        opacity: 0.7,
    },
    "& .cm-completionListIncompleteTop:before, & .cm-completionListIncompleteBottom:after": {
        color: "var(--autocomplete-detail-fg)",
    },
});

const panelTheme = EditorView.baseTheme({
    "& .cm-panels": {
        backgroundColor: "var(--panel-bg-color)",
        borderColor: "var(--panel-border-color)",
        color: "var(--panel-text-color)",
    },
});

const editorThemeCompartment = new Compartment()

const staticEditorTheme: Extension[] = [
    panelTheme,
    autocompleteTheme,
]

/** Editor chrome aligned with CSS variables in editor.css. */
export function createEditorTheme(isDark: boolean): Extension[] {
    return [
        editorThemeCompartment.of(EditorView.darkTheme.of(isDark)),
        ...staticEditorTheme,
    ]
}

export function reconfigureEditorTheme(view: EditorView, isDark: boolean): void {
    view.dispatch({
        effects: editorThemeCompartment.reconfigure(EditorView.darkTheme.of(isDark)),
    })
}

/** @deprecated Use createEditorTheme(isDark) */
export const editorTheme = createEditorTheme(true)
