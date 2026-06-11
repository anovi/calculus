import { Compartment, type Extension } from '@codemirror/state'
import { EditorView } from 'codemirror'


const autocompleteTheme = EditorView.baseTheme({
    "& .cm-tooltip-autocomplete": {
        border: "none!important",
        boxShadow: "var(--shadow-sm)",
        background: "var(--autocomplete-bg) !important",
        color: "var(--text-primary)",
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
        paddingLeft: "8px!important",
    },
    "& .cm-tooltip-autocomplete > ul > li[aria-selected]": {
        background: "transparent!important",
        position: "relative",
        color: "var(--text-primary)!important",
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
        color: "var(--text-primary)",
    },
    "& .cm-tooltip-autocomplete > ul > completion-section": {
        border: "none",
        color: "var(--text-secondary)",
    },
    "& .cm-completionMatchedText": {
        color: "var(--autocomplete-matched-fg)",
        textDecorationColor: "var(--autocomplete-matched-fg)",
    },
    "& .cm-completionDetail": {
        color: "var(--text-secondary)",
    },
    "& .cm-tooltip-autocomplete .cm-completionIcon": {
        color: "var(--icon-color)",
        opacity: 1,
    },
    "& li:has(.cm-completionIcon-function) .cm-completionIcon": {
        color: "var(--editor-function)",
        opacity: 1,
    },
    "& .cm-completionListIncompleteTop:before, & .cm-completionListIncompleteBottom:after": {
        color: "var(--text-secondary)",
    },
});

const panelTheme = EditorView.baseTheme({
    "& .cm-panels": {
        backgroundColor: "transparent",
        borderColor: "transparent",
        color: "var(--text-primary)",
    },
});

const editorThemeCompartment = new Compartment()

const staticEditorTheme: Extension[] = [
    panelTheme,
    autocompleteTheme,
]

/** Editor chrome aligned with CSS variables in styles.css. */
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
