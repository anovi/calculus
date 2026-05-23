import { ViewPlugin, type Panel } from "@codemirror/view";
import { undo, redo } from "@codemirror/commands";
import { EditorView } from "@codemirror/view";

import { toggleInlineFormat } from '../commands';
import { OperationsDictionary, type Operation, type OperationDef } from './operations-dictionary';
import { createPanelPositioner, type PanelPositioner } from "./panel-positioner";



// const APPLE_DEVICE_REGEX = /iPhone|iPad|iPod|iOS/;
// function isAppleDevice(): boolean {
//     return APPLE_DEVICE_REGEX.test(window.navigator.userAgent)
// }


// Create templates for buttons
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
        element.blur();
    });

    element.addEventListener('click', (e) => {
        e.preventDefault();
        if (suppressClick) {
            suppressClick = false;
            return;
        }
        onclick();
        element.blur();
    });
}

/* function mainButton(onclick?: (e: MouseEvent) => void) {
    const dom = document.createElement('button');
    dom.classList.add('cm-suggestions-main-button');
    dom.innerHTML = '…';
    dom.addEventListener('click', (e) => {
        e.preventDefault();
        onclick?.(e);
        releasePanelButtonFocus(dom);
    });
    return dom;
} */

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

export function createHelpPanel(view: EditorView): Panel {
    const fakeDom = document.createElement("div");

    const dom = document.createElement("div");
    dom.className = "cm-help-panel";
    dom.id = "cm-suggestions-panel";
    dom.setAttribute('aria-hidden', 'true');

    const dismissBtn = dismissKeyboardButton(view);

    const buttonsEl = document.createElement('div');
    buttonsEl.classList.add('suggestion-panel-buttons');
    buttonsEl.append(...undoRedoButtons(view, buttonsEl));
    
    dom.appendChild(buttonsEl);
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


const HelpPanelViewPlugin = ViewPlugin.fromClass(class HelpPanelView {
    #positioner: PanelPositioner;

    constructor(view: EditorView) {
        const panel = createHelpPanel(view);
        if (panel.mount) panel.mount();

        const elem = document.getElementById('cm-suggestions-panel') as HTMLDivElement | null;
        if (!elem) throw new Error('Suggestions panel element missing');

        this.#positioner = createPanelPositioner({
            dock: elem,
            getVisible: () => view.hasFocus,
        });
    }

    destroy() {
        this.#positioner.destroy();
    }
});

  
export function helpPanel() {
    return [/* helpPanelState,  SuggestionsStateField,*/ HelpPanelViewPlugin]
}

