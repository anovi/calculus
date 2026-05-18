import { showPanel, ViewPlugin, type Panel } from "@codemirror/view";
import { type NodeIterator } from '@lezer/common';
import { syntaxTree } from '@codemirror/language';
import { EditorView } from "@codemirror/view";
import { StateField, StateEffect } from "@codemirror/state";

import { isAtomicSelection } from "../lib/codemirror";
import { terms } from "../language";

const toggleHelp = StateEffect.define<boolean>();

const NONE: Operation[] = [];
const WHITESPACE_EXCEPT_NEWLINE = /^[^\S\r\n]+$/

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
        const state = tr.state;
        const tree = syntaxTree(state);

        // Skips spaces going back until meets non-space
        // `point` will be at the boundary
        let point = from;
        // debugger
        while (point > 0) {
            const textBeforeSelection = state.sliceDoc(point - 1, from);
            if (!textBeforeSelection.match(WHITESPACE_EXCEPT_NEWLINE)) break;
            point--;
        }
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
    // provide: () => showPanel.of(createHelpPanel)
})

function button(op: Operation) {
    const dom = document.createElement('button');
    dom.innerHTML = op.sign;
    dom.setAttribute('data-operation', op.operation);
    return dom;
}

function createHelpPanel(_view: EditorView): Panel {
    const dom = document.createElement("div");
    const fakeDom = document.createElement("div");
    dom.className = "cm-help-panel";
    dom.id = "cm-suggestions-panel";
    return {
        top: false,
        dom: fakeDom,
        mount: () => {
            document.body.appendChild(dom);
        },
        destroy: () => {
            dom.remove();
        },
        update: (update) => {
            dom.innerHTML = '';
            const suggestions = update.state.field(SuggestionsStateField);
            for (let index = 0; index < suggestions.length; index++) {
                const operation = suggestions[index];
                dom.appendChild(button(operation));
            }
            fakeDom.style.height = dom.getBoundingClientRect().height + 'px';
        },
    };
}



type Operation = { sign: string, operation: string };

const binaryOps: Operation[] = [{
    sign: '+',
    operation: 'plus',
}, {
    sign: '*',
    operation: 'multiply',
}];

const equal: Operation = {
    sign: '=',
    operation: 'euqal',
}

const NodeTypes = {
    containers: [terms.AddExpression, terms.MulExpression, terms.ConvertExpression],
    atomics: [terms.PlusBinaryOp, terms.TimesBinaryOp, terms.ConvertOp, terms.Unit, terms.Number],
    binaryOperations: [terms.AddExpression, terms.MulExpression, terms.ConvertExpression],
}

type SuggestionRule = {
    in?: number[],
    notIn?: number[],
    siblingBefore?: number,
    suggest: Operation[],
};

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


// Positioning for iOS
const HelpPanelViewPlugin = ViewPlugin.fromClass(class HelpPanelView {

    #dock: HTMLDivElement;

    constructor() {
        const elem = document.getElementById('cm-suggestions-panel') as HTMLDivElement | null;
        if (!elem) throw 'Should be a panel!';
        this.#dock = elem;
        console.log(elem)
        this.fixPosition();
    }
    
    fixPosition() {
        const vv = window.visualViewport!;
        const ih = window.innerHeight;
        this.#dock.style.bottom = `${Math.max(0, ih - vv.height - vv.offsetTop)}px`;
        window.visualViewport?.addEventListener("resize", this.resizeHandler.bind(this));
    }

    resizeHandler() {
        const vv = window.visualViewport!;
        const ih = window.innerHeight;
        // if (!/iPhone|iPad|iPod/.test(window.navigator.userAgent)) {
            // this.#height = ;
            console.log(window.visualViewport!.height)
            console.log(Math.max(0, ih - vv.height - vv.offsetTop))
            
        // }
        // this.#dock.style.bottom = `${window.innerHeight - window.visualViewport!.height + 10}px`;
        this.#dock.style.bottom = `${Math.max(0, ih - vv.height - vv.offsetTop)}px`;

        // `${Math.max(0, ih - vv.height - vv.offsetTop)}px`;
    }
})



export function helpPanel() {
    return [helpPanelState, SuggestionsStateField, HelpPanelViewPlugin]
}