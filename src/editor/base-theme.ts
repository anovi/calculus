import { EditorView } from "codemirror";

const autocompleteTheme = EditorView.baseTheme({
    "& .cm-tooltip": {
        backgroundColor: "var(--autocomplete-bg)",
        color: "var(--autocomplete-fg)",
        border: "1px solid var(--autocomplete-border)",
        borderRadius: "6px",
        boxShadow: "0 4px 16px rgba(0, 0, 0, 0.35)",
    },
    "& .cm-tooltip-autocomplete > ul": {
        fontFamily: "inherit",
    },
    "& .cm-tooltip-autocomplete > ul > li[aria-selected]": {
        backgroundColor: "var(--autocomplete-selected-bg)",
        color: "var(--autocomplete-selected-fg)",
    },
    "& .cm-tooltip-autocomplete-disabled > ul > li[aria-selected]": {
        backgroundColor: "rgba(200, 209, 224, 0.12)",
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
    "& .cm-tooltip.cm-completionInfo": {
        backgroundColor: "var(--autocomplete-bg)",
        color: "var(--autocomplete-fg)",
        border: "1px solid var(--autocomplete-border)",
        borderRadius: "6px",
    },
    "& .cm-completionListIncompleteTop:before, & .cm-completionListIncompleteBottom:after": {
        color: "var(--autocomplete-detail-fg)",
    },
});

const panelTheme = EditorView.baseTheme({
    "& .cm-panels": {
        backgroundColor: "var(--panel-bg-color)",
        borderColor: "var(--panel-border-color)",
        color: "var(--panel-color)",
    },
});

/** Editor chrome aligned with CSS variables in editor.css. */
export const editorTheme = [
    EditorView.darkTheme.of(true),
    panelTheme,
    autocompleteTheme,
];
