import {
    type Completion, type CompletionResult,
    type CompletionSource
} from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';
import type { SyntaxNode } from '@lezer/common';

import { terms } from '../../language';
import { calcRangesField } from '../values-field';
  

function getIdentifierNames(state: EditorState, exclude: SyntaxNode): string[] {
    const fieldValue = state.field(calcRangesField);
    const cur = fieldValue.ranges.iter();
    const res: string[] = [];
    while (cur.value) {
        if (cur.value.name && cur.from != exclude.from && cur.to != exclude.to) res.push(cur.value.name);
        cur.next();
    }
    return res;
}

export const variableCompletionSource: CompletionSource = (context): CompletionResult | null => {
    const tree = syntaxTree(context.state);
    const pos = context.pos;
    const node = tree.resolveInner(pos, -1);
  
    if (node.type.id !== terms.Identifier) return null;
    const identifier = context.state.sliceDoc(node.from, node.to);
    if (!identifier && !context.explicit) return null;

    if (node.parent?.type.id === terms.FunctionCall) return null;

    const variableNames = getIdentifierNames(context.state, node);
    const options: Completion[] = [];
    for (let index = 0; index < variableNames.length; index++) {
        const name = variableNames[index];
        options.push({ label: name });
    }

    return {
      from: node.from,
      to: node.to,
      options: options,
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