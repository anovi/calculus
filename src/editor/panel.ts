import { showPanel, type Panel } from "@codemirror/view"
import { type SyntaxNode, TreeCursor, type NodeIterator } from '@lezer/common'
import { syntaxTree } from '@codemirror/language';
import { EditorView } from "@codemirror/view"
import { StateField, StateEffect } from "@codemirror/state"

import { isAtomicSelection } from "../lib/codemirror"
import { terms } from "../language";

const toggleHelp = StateEffect.define<boolean>();

const NONE: Operation[] = [];

export const helpPanelState = StateField.define<boolean>({
    create: () => true,
    update(value, tr) {
        for (let e of tr.effects) if (e.is(toggleHelp)) value = e.value
        return value
    },
    provide: () => showPanel.of(createHelpPanel)
})

export const SuggestionsStateField = StateField.define<Operation[]>({
    create: (_state) => NONE,
    update(_value, tr) {
        const selection = tr.state.selection;
        if (!isAtomicSelection(selection)) return NONE;
        const from = selection.main.from;
        const tree = syntaxTree(tr.state);
        let nodeCur: NodeIterator|null = tree.resolveStack(from, -1);
        const stack: string[] = [];
        const stackTypeIDs: number[] = [];
        while (nodeCur?.node)  {
            stack.push(nodeCur.node.name);
            stackTypeIDs.push(nodeCur.node.type.id);
			nodeCur = nodeCur.next;
		}
        console.log(stack.join(' <-- '));

        const innerMostNode = tree.resolveInner(from, -1);
        console.log(innerMostNode.name)

        const rule: SuggestionRule|undefined = superMap[innerMostNode.type.id];
        if (!rule) return NONE;
        if (rule.notIn?.includes(stackTypeIDs[0])) return NONE;

        return rule.suggest;
    },
    // provide: () => showPanel.of(createHelpPanel)
})

function button(op: Operation) {
    const dom = document.createElement('button');
    dom.innerHTML = op.sign;
    dom.setAttribute('data-operation', op.operation);
    return dom;
}

function createHelpPanel(_view: EditorView): Panel {
    let dom = document.createElement("div");
    let value: Operation[] = [];
    dom.textContent = "F1: Toggle the help panel"
    dom.className = "cm-help-panel"
    return {
        top: false,
        dom,
        update: (update) => {
            dom.innerHTML = '';
            const suggestions = update.state.field(SuggestionsStateField);
            for (let index = 0; index < suggestions.length; index++) {
                const operation = suggestions[index];
                dom.appendChild(button(operation));
            }
            value = suggestions;
        },
    };
}

export function helpPanel() {
    return [helpPanelState, SuggestionsStateField]
}

type Operation = { sign: string, operation: string };
const binaryOps: Operation[] = [{
    sign: '+',
    operation: 'plus',
}, {
    sign: '*',
    operation: 'multiply',
}];

const NodeTypes = {
    containers: [terms.AddExpression, terms.MulExpression, terms.ConvertExpression],
    atomics: [terms.PlusBinaryOp, terms.TimesBinaryOp, terms.ConvertOp, terms.Unit, terms.Number],
}

type SuggestionRule = {
    in?: number[],
    notIn?: number[],
    suggest: Operation[]
};

const superMap: Record<number, SuggestionRule> = {
    [terms.Number]: {
        suggest: binaryOps,
        notIn: [terms.AddExpression, terms.MulExpression],
    }
};