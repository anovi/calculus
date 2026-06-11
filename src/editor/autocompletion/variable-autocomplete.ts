import {
    type Completion, type CompletionResult,
    type CompletionSource
} from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import { EditorSelection, type EditorState } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';

import { terms } from '../../language';
import { calcRangesField } from '../values-field';
import { BUILTIN_FUNCTIONS } from '../../calculator';
import { isBindingIdentifier } from '../language-tools';
import { functionCallContextAt } from '../function-args/function-args-context';
import {
  completionApplyWithArgAdvance,
  selectionAfterFunctionInsert,
} from '../function-args/function-args-completion';
  

function getIdentifierNames(state: EditorState, exclude?: SyntaxNode): string[] {
    const fieldValue = state.field(calcRangesField);
    const cur = fieldValue.ranges.iter();
    const res: string[] = [];
    while (cur.value) {
        if (
            cur.value.name &&
            !(exclude && cur.from === exclude.from && cur.to === exclude.to)
        ) res.push(cur.value.name);
        cur.next();
    }
    return res;
}

export const variableCompletionSource: CompletionSource = (context): CompletionResult | null => {
    const tree = syntaxTree(context.state);
    const pos = context.pos;
    const node = tree.resolveInner(pos, -1);
  
    if (node.type.id !== terms.Identifier) return null;
    if (isBindingIdentifier(node)) return null;
    const identifier = context.state.sliceDoc(node.from, node.to);
    if (!identifier && !context.explicit) return null;

    const options: Completion[] = [];
    const isEditingFunctionName = node.parent?.type.id === terms.FunctionCall;
    const useArgAdvance =
      !isEditingFunctionName && functionCallContextAt(context.state, pos) != null;

    // Alwais add functions
    for (let index = 0; index < BUILTIN_FUNCTIONS.length; index++) {
        const fnDef = BUILTIN_FUNCTIONS[index];

        if (isEditingFunctionName)
            options.push({ label: fnDef.name, detail: fnDef.doc, type: 'function' })
        else if (useArgAdvance)
            options.push({
                label: fnDef.name,
                detail: fnDef.doc,
                type: 'function',
                apply: completionApplyWithArgAdvance(fnDef.name),
            })
        else
            options.push({
                label: fnDef.name,
                detail: fnDef.doc,
                info: fnDef.doc,
                type: 'function',
                apply: (view, _completion, from, to) => {
                    const insert = `${fnDef.name}()`;
                    view.dispatch({
                        changes: {
                            insert, from, to,
                        },
                        selection: EditorSelection.cursor(
                            selectionAfterFunctionInsert(from, insert.length, fnDef.arity),
                        ),
                    })
                },
            })
    }

    // Editing funciton call, so no variables
    if (isEditingFunctionName) {
        return {
            from: node.from,
            to: node.to,
            options,
            update: (_current, from, to) => ({ from, to, options }),
        }
    }

    // Add variables names
    const variableNames = getIdentifierNames(context.state);
    for (let index = 0; index < variableNames.length; index++) {
        const name = variableNames[index];
        options.push({
            label: name,
            type: 'variable',
            ...(useArgAdvance ? { apply: completionApplyWithArgAdvance(name) } : {}),
        });
    }

    return {
      from: node.from,
      to: node.to,
      options,
      update: (_current, from, to) => ({ from, to, options }),
    //   update(_current, _from, _to, context) {
    //     const pos = context.pos;
    //     const tree = syntaxTree(context.state);
    //     const node = tree.resolveInner(pos, -1);
    //     const identifier = context.state.sliceDoc(node.from, node.to);
    //     if (!identifier && !context.explicit) return null;
    //     const variableNames = getIdentifierNames(context.state, node);
    //   },
    };
};