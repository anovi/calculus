import { linter, type Diagnostic } from "@codemirror/lint"
import { formatUnitChoiceLabel } from "../units";
import { calcRangesField } from "./values-field";


export const calcSyntaxLinter = linter(view => {
    const diagnostics: Diagnostic[] = [];

    const field = view.state.field(calcRangesField);
    const cur = field.ranges.iter();
    while (cur.value) {
        if (cur.value.error) {
            const choices = cur.value.unitChoices;
            if (choices)
                diagnostics.push({
                    from: cur.value.errorFrom!,
                    to: cur.value.errorTo!,
                    severity: "warning",
                    message: `Which unit did you mean?`,
                    actions: choices?.length
                        ? choices.map((choice) => ({
                            name: formatUnitChoiceLabel(choice),
                            apply(view, from, to) {
                                view.dispatch({ changes: { from, to, insert: choice } });
                            },
                        }))
                        : [{
                            name: "Remove",
                            apply(view, from, to) { view.dispatch({changes: {from, to}}) }
                        }],
                })
            else 
            diagnostics.push({
                from: cur.value.errorFrom!,
                to: cur.value.errorTo!,
                severity: "warning",
                message: cur.value.error,
                actions: [{
                    name: "Remove",
                    apply(view, from, to) { view.dispatch({changes: {from, to}}) }
                }],
            })
        }
        cur.next();
    }
    return diagnostics;
}, {
    'autoPanel': false,
});