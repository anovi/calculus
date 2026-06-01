import { Compartment, type Extension } from '@codemirror/state'
import { EditorView } from 'codemirror'


const autocompleteTheme = EditorView.baseTheme({
    "& .cm-tooltip-autocomplete": {
        border: "none!important",
        boxShadow: "var(--autocomplete-shadow)",
        background: "var(--autocomplete-bg)",
        color: "var(--autocomplete-fg)",
    },
    "& .cm-tooltip-autocomplete > ul": {
        fontFamily: "inherit",
        border: "none!important",
    },
    "& .cm-tooltip-autocomplete > ul > li": {
        borderRadius: "4px",
        position: "relative",
        paddingTop: "2px!important",
        paddingBottom: "2px!important",
    },
    "& .cm-tooltip-autocomplete > ul > li[aria-selected]": {
        background: "transparent!important",
        color: "var(--autocomplete-selected-fg)!important",
        position: "relative",
    },
    "& .cm-tooltip-autocomplete > ul > li[aria-selected]::after": {
        content: "''",
        backgroundColor: "var(--autocomplete-selected-bg)",
        position: "absolute",
        display: "block",
        top: "2px", left: "2px", right: "2px", bottom: "2px",
        zIndex: -1,
        borderRadius: "4px",
        pointerEvents: "none",
    },
    "& .cm-tooltip-autocomplete-disabled > ul > li[aria-selected]": {
        color: "var(--autocomplete-fg)",
    },
    "& .cm-tooltip-autocomplete > ul > completion-section": {
        border: "none",
        color: "var(--autocomplete-detail-fg)",
    },
    "& .cm-completionMatchedText": {
        color: "var(--autocomplete-matched-fg)",
        textDecorationColor: "var(--autocomplete-matched-fg)",
    },
    "& .cm-completionDetail": {
        color: "var(--autocomplete-detail-fg)",
    },
    "& [aria-selected] > .cm-completionDetail": {
        color: "var(--autocomplete-selected-detail-fg)",
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
