import { EditorView } from "codemirror";

export const editorTheme = EditorView.baseTheme({
    [`& .cm-panels`]: {
        backgroundColor: 'var(--panel-bg-color)',
        borderColor: 'var(--panel-border-color)',
        color: 'var(--panel-color)',
    }
})