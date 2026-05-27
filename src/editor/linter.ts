import { linter, type Diagnostic } from "@codemirror/lint"
import { calcRangesField } from "./values-field";


export const calcSyntaxLinter = linter(view => {
    const diagnostics: Diagnostic[] = [];

    const field = view.state.field(calcRangesField);
    const cur = field.ranges.iter();
    while (cur.value) {
        if (cur.value.error) {
            diagnostics.push({
                from: cur.value.errorFrom!,
                to: cur.value.errorTo!,
                severity: "warning",
                message: cur.value.error,
                actions: [{
                    name: "Remove",
                    apply(view, from, to) { view.dispatch({changes: {from, to}}) }
                }]
            })
        }
        cur.next();
    }
    return diagnostics;
}, {
    'autoPanel': false,
});