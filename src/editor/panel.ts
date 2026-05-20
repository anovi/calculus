import { showPanel, ViewPlugin, type Panel } from "@codemirror/view";
import { undo, redo } from "@codemirror/commands";
import { type NodeIterator } from '@lezer/common';
import { syntaxTree } from '@codemirror/language';
import { EditorView } from "@codemirror/view";
import { StateField, StateEffect, EditorState } from "@codemirror/state";

import { isAtomicSelection } from "../lib/codemirror";
import { terms } from "../language";
import { toggleInlineFormat  } from "./editor-commands";
import { OperationsDictionary, type Operation, type OperationDef } from "./operations-dictionary";
// import styles from '../editor.module.css'

const toggleHelp = StateEffect.define<boolean>();

const NONE: OperationDef[] = [];
const WHITESPACE_EXCEPT_NEWLINE = /^[^\S\r\n]+$/

// const APPLE_DEVICE_REGEX = /iPhone|iPad|iPod|iOS/;
// function isAppleDevice(): boolean {
//     return APPLE_DEVICE_REGEX.test(window.navigator.userAgent)
// }

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
    // provide: () => showPanel.of(createHelpPanel)
})


for (const key in OperationsDictionary) {
    if (Object.prototype.hasOwnProperty.call(OperationsDictionary, key)) {
        const op = OperationsDictionary[key as Operation];
        const html = `<button data-operation="${op.operation}"><div class="op ${op.operation}">${op.sign}</div></button>`;
        const template = document.createElement('template');
        template.innerHTML = html.trim();
    }
}

/** Finger movement above this is a scroll/swipe, not a panel button tap (iOS). */
const TAP_MOVE_THRESHOLD_PX = 10;

type TouchTapStart = { x: number; y: number; scrollLeft: number };

function touchMovedBeyondTap(
    x: number,
    y: number,
    start: TouchTapStart,
): boolean {
    const dx = x - start.x;
    const dy = y - start.y;
    return Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD_PX;
}

function button(
    op: OperationDef,
    onclick: (op: OperationDef) => void,
    scrollContainer?: HTMLElement,
) {
    const template = document.createElement('template');
    template.innerHTML = `<button data-operation="${op.operation}"><div class="op ${op.operation}">${op.sign}</div></button>`;
    const dom = template.content.firstElementChild as HTMLButtonElement;
    createButtonHandler(dom, onclick.bind(null, op), scrollContainer);
    return dom;
}

/** Drop focus after tap so iOS Safari does not keep a shaded :focus state on the button. */
function releasePanelButtonFocus(element: HTMLButtonElement) {
    element.blur();
}

function createButtonHandler<H extends (...bindings: any[]) => void>(
    element: HTMLButtonElement,
    onclick: H,
    scrollContainer?: HTMLElement,
) {
    let touchStart: TouchTapStart | null = null;
    let suppressClick = false;

    element.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) {
            touchStart = null;
            return;
        }
        const t = e.touches[0];
        touchStart = {
            x: t.clientX,
            y: t.clientY,
            scrollLeft: scrollContainer?.scrollLeft ?? 0,
        };
    }, { passive: true });

    element.addEventListener('touchmove', (e) => {
        if (!touchStart || e.touches.length !== 1) return;
        const t = e.touches[0];
        if (touchMovedBeyondTap(t.clientX, t.clientY, touchStart)) {
            touchStart = null;
        }
    }, { passive: true });

    element.addEventListener('touchend', (e) => {
        const start = touchStart;
        touchStart = null;
        if (!start) return;

        const t = e.changedTouches[0];
        if (!t || touchMovedBeyondTap(t.clientX, t.clientY, start)) return;
        if (
            scrollContainer &&
            Math.abs(scrollContainer.scrollLeft - start.scrollLeft) > 1
        ) {
            return;
        }

        e.preventDefault();
        suppressClick = true;
        onclick();
        releasePanelButtonFocus(element);
    });

    element.addEventListener('click', (e) => {
        e.preventDefault();
        if (suppressClick) {
            suppressClick = false;
            return;
        }
        onclick();
        releasePanelButtonFocus(element);
    });
}

function mainButton(onclick?: (e: MouseEvent) => void) {
    const dom = document.createElement('button');
    dom.classList.add('cm-suggestions-main-button');
    dom.innerHTML = '…';
    dom.addEventListener('click', (e) => {
        e.preventDefault();
        onclick?.(e);
        releasePanelButtonFocus(dom);
    });
    return dom;
}

function dismissEditorFocus(view: EditorView) {
    view.contentDOM.blur();
    const active = document.activeElement;
    if (active instanceof HTMLElement && view.dom.contains(active)) {
        active.blur();
    }
}

function dismissKeyboardButton(view: EditorView): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.classList.add('cm-suggestions-main-button');
    btn.setAttribute('aria-label', 'Dismiss keyboard');
    btn.innerHTML = '⌄';
    createButtonHandler(btn, () => dismissEditorFocus(view));
    return btn;
}

function undoRedoButtons(
    view: EditorView,
    scrollContainer: HTMLElement,
): [HTMLButtonElement, HTMLButtonElement] {
    const undoButton = document.createElement('button');
    undoButton.innerHTML = "\u293A";
    createButtonHandler(undoButton, () => {
        undo({
            state: view.state,
            dispatch(transaction) {
                view.dispatch(transaction);
            },
        })
    }, scrollContainer)
    const redoButton = document.createElement('button');
    redoButton.innerHTML = "\u293B";
    createButtonHandler(redoButton, () => {
        redo({
            state: view.state,
            dispatch(transaction) {
                view.dispatch(transaction);
            },
        })
    }, scrollContainer)
    return [undoButton, redoButton];
}

function createHelpPanel(view: EditorView): Panel {
    const dom = document.createElement("div");
    const fakeDom = document.createElement("div");
    dom.className = "cm-help-panel";
    dom.id = "cm-suggestions-panel";
    dom.setAttribute('aria-hidden', 'true');
    const dismissBtn = dismissKeyboardButton(view);
    // dom.appendChild(dismissBtn);
    const buttonsEl = document.createElement('div');
    buttonsEl.classList.add('suggestion-panel-buttons');
    dom.appendChild(buttonsEl);
    buttonsEl.append(...undoRedoButtons(view, buttonsEl));

    // HIDE FOR NOW
    // const mainBtn = mainButton(); 

    dom.appendChild(dismissBtn);

    const buttons: HTMLButtonElement[] = [];
    const dispatch = (operation: OperationDef) => {
        if (operation.insert) {
            const result = toggleInlineFormat(view.state, operation.insert);
            if (!result.ok) {
                console.error(result.reason);
                return;
            }
            view.dispatch(result.value);
        }
    }

    function renderAllButtons () {
        buttons.forEach(btn => btn.remove());
        buttons.splice(0, button.length);
        for (const key in OperationsDictionary) {
            if (Object.prototype.hasOwnProperty.call(OperationsDictionary, key)) {
                const operation = OperationsDictionary[key as Operation];
                const btn = button(operation, (operation) => {
                    if (operation.insert) dispatch(operation);
                }, buttonsEl);
                buttons.push(btn);
                buttonsEl.appendChild(btn);    
            }
        }
        fakeDom.style.height = dom.getBoundingClientRect().height + 'px';
    }

    renderAllButtons();

    return {
        top: false,
        dom: fakeDom,
        mount: () => {
            document.body.appendChild(dom);
        },
        destroy: () => {
            dom.remove();
        },
        // update: (update) => {
        //     buttons.forEach(btn => btn.remove());
        //     buttons.splice(0, button.length);
        //     const suggestions = update.state.field(SuggestionsStateField);
        //     for (let index = 0; index < suggestions.length; index++) {
        //         const operation = suggestions[index];
        //         const btn = button(operation, (operation) => {
        //             if (operation.insert) dispatch(operation);
        //         });
        //         buttons.push(btn);
        //         dom.appendChild(btn);
        //     }
        //     fakeDom.style.height = dom.getBoundingClientRect().height + 'px';
        // },
    };
}




const binaryOps: OperationDef[] = [OperationsDictionary.division, OperationsDictionary.minus, OperationsDictionary.plus, OperationsDictionary.multiplication];

const equal = OperationsDictionary.euqal;

const NodeTypes = {
    containers: [terms.AddExpression, terms.MulExpression, terms.ConvertExpression],
    atomics: [terms.PlusBinaryOp, terms.TimesBinaryOp, terms.ConvertOp, terms.Unit, terms.Number],
    binaryOperations: [terms.AddExpression, terms.MulExpression, terms.ConvertExpression],
}

type SuggestionRule = {
    in?: number[],
    notIn?: number[],
    siblingBefore?: number,
    suggest: OperationDef[],
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


/** Space taken by the virtual keyboard (layout viewport vs visual viewport). */
function keyboardInset(): number {
    const vv = window.visualViewport;
    if (!vv) return 0;
    return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
}

/** Ignore browser chrome / rounding; real mobile keyboards are much larger. */
const KEYBOARD_INSET_THRESHOLD = 50;

/** Re-read inset after iOS keyboard animation (resize fires early/late). */
const SYNC_FOLLOW_UP_MS = [100, 250, 400, 600] as const;

// Positioning + visibility for mobile virtual keyboard (iOS visualViewport timing:
// resize on show = start of animation; resize on hide = after animation ends).
const HelpPanelViewPlugin = ViewPlugin.fromClass(class HelpPanelView {
    #dock: HTMLDivElement;
    #view: EditorView;
    #rafId: number | null = null;
    #followUpTimers: ReturnType<typeof setTimeout>[] = [];
    #onViewportChange = () => this.#scheduleSync();
    #onEditorFocusIn = () => this.#scheduleSync();

    constructor(view: EditorView) {
        this.#view = view;
        const elem = document.getElementById('cm-suggestions-panel') as HTMLDivElement | null;
        if (!elem) throw new Error('Suggestions panel element missing');
        this.#dock = elem;

        view.dom.addEventListener('focusin', this.#onEditorFocusIn);
        view.dom.addEventListener('focusout', this.#onEditorFocusOut);

        const vv = window.visualViewport;
        vv?.addEventListener('resize', this.#onViewportChange);
        vv?.addEventListener('scroll', this.#onViewportChange);

        // KEEP IT FOR LATER
        // if ("virtualKeyboard" in navigator) {
        //     navigator.virtualKeyboard.overlaysContent = true;
        //     navigator.virtualKeyboard.addEventListener("geometrychange", (event) => {
        //         const { x, y, width, height } = event.target.boundingRect;
        //         console.log(event);
        //     });
        // }

        this.#scheduleSync();
    }

    #onEditorFocusOut = () => {
        // Blur hides the panel immediately; iOS reports keyboard shrink only after
        // the hide animation, so we must not wait for the next resize here.
        this.#cancelScheduledSync();
        this.#applySync();
    };

    #scheduleSync() {
        this.#cancelScheduledSync();

        this.#rafId = requestAnimationFrame(() => {
            this.#rafId = null;
            this.#applySync();
            requestAnimationFrame(() => this.#applySync());
        });

        for (const delay of SYNC_FOLLOW_UP_MS) {
            this.#followUpTimers.push(
                setTimeout(() => this.#applySync(), delay),
            );
        }
    }

    #cancelScheduledSync() {
        if (this.#rafId !== null) {
            cancelAnimationFrame(this.#rafId);
            this.#rafId = null;
        }
        for (const id of this.#followUpTimers) clearTimeout(id);
        this.#followUpTimers = [];
    }

    #applySync() {
        const inset = keyboardInset();
        const keyboardOpen = inset > KEYBOARD_INSET_THRESHOLD;
        const visible = this.#view.hasFocus && keyboardOpen;

        this.#dock.style.bottom = `${inset}px`;
        this.#dock.classList.toggle('cm-suggestions-panel--visible', visible);
        this.#dock.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }

    destroy() {
        this.#cancelScheduledSync();
        this.#view.dom.removeEventListener('focusin', this.#onEditorFocusIn);
        this.#view.dom.removeEventListener('focusout', this.#onEditorFocusOut);
        const vv = window.visualViewport;
        vv?.removeEventListener('resize', this.#onViewportChange);
        vv?.removeEventListener('scroll', this.#onViewportChange);
    }
});


// const helpTheme = EditorView.baseTheme({
//     ".cm-help-panel": {
//       padding: "5px 10px",
//       backgroundColor: "#fffa8f",
//       fontFamily: "monospace"
//     }
// })
  
export function helpPanel() {
    return [helpPanelState, SuggestionsStateField, HelpPanelViewPlugin]
}

