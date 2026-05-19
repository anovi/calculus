import { showPanel, ViewPlugin, type Panel } from "@codemirror/view";
import { type NodeIterator } from '@lezer/common';
import { syntaxTree } from '@codemirror/language';
import { EditorView } from "@codemirror/view";
import { StateField, StateEffect, EditorState } from "@codemirror/state";

import { isAtomicSelection } from "../lib/codemirror";
import { terms } from "../language";
import { toggleInlineFormat, type Format } from "./editor-commands";

const toggleHelp = StateEffect.define<boolean>();

const NONE: Operation[] = [];
const WHITESPACE_EXCEPT_NEWLINE = /^[^\S\r\n]+$/
const APPLE_DEVICE_REGEX = /iPhone|iPad|iPod|iOS/;

function isAppleDevice(): boolean {
    return APPLE_DEVICE_REGEX.test(window.navigator.userAgent)
}

export const helpPanelState = StateField.define<boolean>({
    create: () => true,
    update(value, tr) {
        for (let e of tr.effects) if (e.is(toggleHelp)) value = e.value
        return value
    },
    provide: () => showPanel.of(createHelpPanel)
})

function skipWhiteSpaceBackward(state: EditorState, from: number) {
    let point = from;
    while (point > 0) {
        const textBeforeSelection = state.sliceDoc(point - 1, from);
        if (!textBeforeSelection.match(WHITESPACE_EXCEPT_NEWLINE)) break;
        point--;
    }
    return point;
}

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
    // provide: () => showPanel.of(createHelpPanel)
})

function button(op: Operation, onclick: (op: Operation) => void) {
    const dom = document.createElement('button');
    dom.innerHTML = op.sign;
    dom.setAttribute('data-operation', op.operation);
    dom.addEventListener("touchend", (e) => {
        e.preventDefault();
        onclick(op);
    });
    dom.addEventListener('click', (e) => {
        e.preventDefault();
        onclick(op);
    });
    // dom.addEventListener('click', (e) => console.log(e.type, e));
    // dom.addEventListener('touchend', (e) => console.log(e.type, e));
    // dom.addEventListener('touchstart', (e) => console.log(e.type, e));
    return dom;
}

function mainButton(onclick?: (e: MouseEvent) => void) {
    const dom = document.createElement('button');
    dom.classList.add('cm-suggestions-main-button');
    dom.innerHTML = '…';
    if (onclick) dom.addEventListener('click', onclick);
    return dom;
}

function createHelpPanel(view: EditorView): Panel {
    const dom = document.createElement("div");
    const fakeDom = document.createElement("div");
    dom.className = "cm-help-panel";
    dom.id = "cm-suggestions-panel";
    const mainBtn = mainButton();
    dom.appendChild(mainBtn);
    const buttons: HTMLButtonElement[] = [];
    const dispatch = (operation: Operation) => {
        // const selectionFrom = view.state.selection.main.head;
        // const from = skipWhiteSpaceBackward(view.state, selectionFrom);
        // debugger
        if (operation.insert) {
            const result = toggleInlineFormat(view.state, operation.insert);
            if (!result.ok) console.error(result.reason);
            view.dispatch(result.value);
        }
        // const tr = view.state.update({
        //     changes: { insert, from: selectionFrom },
        // })
        // const newSelection = view.state.selection.map(tr.changes)
        // view.dispatch({
        //     changes: { insert, from: selectionFrom },
        //     selection: newSelection,
        //     // newSelection: newSelection,
        // })
    }
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
            buttons.forEach(btn => btn.remove());
            buttons.splice(0, button.length);
            const suggestions = update.state.field(SuggestionsStateField);
            for (let index = 0; index < suggestions.length; index++) {
                const operation = suggestions[index];
                const btn = button(operation, (operation) => {
                    if (operation.insert) dispatch(operation);
                });
                buttons.push(btn);
                dom.appendChild(btn);
            }
            fakeDom.style.height = dom.getBoundingClientRect().height + 'px';
        },
    };
}



type Operation = {
    sign: string,
    operation: 'plus'|'multiply'|'euqal'
    insert?: Format,
};

const binaryOps: Operation[] = [{
    sign: '+',
    insert: { open: '+', block: false },
    operation: 'plus',
}, {
    sign: '*',
    insert:  { open: '*', block: false },
    operation: 'multiply',
}];

const equal: Operation = {
    sign: '=',
    insert: { open: '=', block: false},
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
        this.resizeHandler();
        window.visualViewport?.addEventListener("resize", this.resizeHandler.bind(this));

        if ("virtualKeyboard" in navigator) {
            navigator.virtualKeyboard.overlaysContent = true;
            navigator.virtualKeyboard.addEventListener("geometrychange", (event) => {
                const { x, y, width, height } = event.target.boundingRect;
                console.log(event);
            });
        }
    }

    resizeHandler() {
        const vv = window.visualViewport!;
        const ih = window.innerHeight;
        // if (!isAppleDevice()) {
            // this.#height = ;
            console.log(window.visualViewport!.height)
            console.log(Math.max(0, ih - vv.height - vv.offsetTop))
            
        // }
        this.#dock.style.bottom = `${Math.max(0, ih - vv.height - vv.offsetTop)}px`;
    }
})



export function helpPanel() {
    return [helpPanelState, SuggestionsStateField, HelpPanelViewPlugin]
}