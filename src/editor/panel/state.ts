import { type NodeIterator } from '@lezer/common';
import { syntaxTree } from '@codemirror/language';
import { StateField } from "@codemirror/state";
import { showPanel } from "@codemirror/view";

import { isAtomicSelection } from '../../lib/codemirror';
import { terms } from '../../language';
import { skipWhiteSpaceBackward } from '../commands';
import { OperationsDictionary, type OperationDef } from './operations-dictionary';
import { toggleHelp } from './effects';
import { createHelpPanel } from './panel';



export type SuggestionRule = {
    in?: number[],
    notIn?: number[],
    siblingBefore?: number,
    suggest: OperationDef[],
};

const NONE: OperationDef[] = [];

const binaryOps: OperationDef[] = [
    OperationsDictionary.division,
    OperationsDictionary.minus,
    OperationsDictionary.plus,
    OperationsDictionary.multiplication,
    OperationsDictionary.exponent,
];

const equal = OperationsDictionary.euqal;

const NodeTypes = {
    containers: [terms.AddExpression, terms.MulExpression, terms.ExpExpression, terms.ConvertExpression],
    atomics: [terms.PlusBinaryOp, terms.TimesBinaryOp, terms.PowBinaryOp, terms.ConvertOp, terms.Unit, terms.Number],
    binaryOperations: [terms.AddExpression, terms.MulExpression, terms.ExpExpression, terms.ConvertExpression],
}

const superMap: Record<number, SuggestionRule[]> = {
    [terms.Number]: [{
        suggest: binaryOps,
    }],
    [terms.Identifier]: [{
        suggest: binaryOps,
        in: NodeTypes.binaryOperations
    }, {
        suggest: [equal, ...binaryOps],
        in: [terms.NoBinding],
    }]
};

export const SuggestionsStateField = StateField.define<OperationDef[]>({
    create: (_state) => NONE,
    update(_value, tr) {
        const selection = tr.state.selection;
        if (!isAtomicSelection(selection)) return NONE;
        const from = selection.main.from;
        const state = tr.state;
        const tree = syntaxTree(state);

        // Skips spaces going back until meets non-space
        // `point` will be at the boundary
        const point = skipWhiteSpaceBackward(state, from);
        let innerMostNode = tree.resolveInner(point, -1);

        let nodeCur: NodeIterator|null = tree.resolveStack(point, -1);
        const stack: string[] = []; // DEBUGGING INFO
        const stackTypeIDs: number[] = [];
        while (nodeCur?.node)  {
            stack.push(nodeCur.node.name); // DEBUGGING INFO
            stackTypeIDs.push(nodeCur.node.type.id);
			nodeCur = nodeCur.next;
		}
        console.log(stack.join(' <-- ')); // DEBUGGING INFO
        console.log(innerMostNode.name) // DEBUGGING INFO

        const rules: SuggestionRule[]|undefined = superMap[innerMostNode.type.id];
        if (!rules) return NONE;
        // const rule: SuggestionRule|undefined = superMap[innerMostNode.type.id];
        for (const rule of rules) {
            if (rule.notIn && rule.notIn.includes(stackTypeIDs[1])) continue;
            if (rule.in && !rule.in.includes(stackTypeIDs[1])) continue;
            return rule.suggest;
        }

        return NONE;
    },
});


export const helpPanelState = StateField.define<boolean>({
    create: () => true,
    update(value, tr) {
        for (let e of tr.effects) if (e.is(toggleHelp)) value = e.value
        return value
    },
    provide: () => showPanel.of(createHelpPanel)
});