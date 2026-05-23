import { ViewPlugin, type Panel, type ViewUpdate } from "@codemirror/view";
import { undo, redo } from "@codemirror/commands";
import { EditorView } from "@codemirror/view";

import { toggleInlineFormat } from '../commands';
import { OperationsDictionary, type Operation, type OperationDef } from './operations-dictionary';
import { toggleHelp } from './effects';
import { createPanelPositioner, type PanelPositioner } from "./panel-positioner";
import { helpPanelState } from "./state";



/** Finger movement above this is a scroll/swipe, not a panel button tap (iOS). */
const TAP_MOVE_THRESHOLD_PX = 10;

type TouchTapStart = { x: number; y: number; scrollLeft: number };


/*===============================================================================
=                                  Components                                   =
===============================================================================*/


// Create templates for buttons
for (const key in OperationsDictionary) {
    if (Object.prototype.hasOwnProperty.call(OperationsDictionary, key)) {
        const op = OperationsDictionary[key as Operation];
        const html = `<button data-operation="${op.operation}"><div class="op ${op.operation}">${op.sign}</div></button>`;
        const template = document.createElement('template');
        template.innerHTML = html.trim();
    }
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

function touchMovedBeyondTap(x: number, y: number, start: TouchTapStart): boolean {
    const dx = x - start.x;
    const dy = y - start.y;
    return Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD_PX;
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

function suggestionPanel(view: EditorView) {
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

    return {
        panel: dom,
        buttonsWrapper: buttonsEl,
        remove: () => dom.remove()
    };
}


/*===============================================================================
=                             Codemirror Extensions                             =
===============================================================================*/

/**
 * Creates Codemirror's panel.
 */
export function createHelpPanel(view: EditorView): Panel {
    const fakePanel = document.createElement("div");
    fakePanel.style.height = 48 + 'px';

    const panel = suggestionPanel(view);    

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
                }, panel.buttonsWrapper);
                buttons.push(btn);
                panel.buttonsWrapper.appendChild(btn);    
            }
        }
    }

    renderAllButtons();

    return {
        top: false,
        dom: fakePanel,
        mount: () => {
            document.body.appendChild(panel.panel);
        },
        destroy: () => {
            console.log('DESTROY')
            panel.remove();
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
        //     fakePanel.style.height = dom.getBoundingClientRect().height + 'px';
        // },
    };
}

/**
 * Dispatches a toggleHelp effect when the editor's focus changes.
 */
const helpPanelFocusSync = EditorView.updateListener.of((update) => {
    if (!update.focusChanged) return;
    const show = update.view.hasFocus;
    if (update.state.field(helpPanelState) === show) return;
    update.view.dispatch({ effects: toggleHelp.of(show) });
});

/**
 * The plugin creates positioner for a panel while panel is active.
 * And destroys positioner when panel hides. It only does syncing.
 */
const HelpPanelViewPlugin = ViewPlugin.fromClass(class HelpPanelView {
    #positioner: PanelPositioner | null = null;

    constructor() {
        this.#syncPositioner(false);
    }

    update(update: ViewUpdate) {
        const wasOpen = update.startState.field(helpPanelState);
        const isOpen = update.state.field(helpPanelState);
        if (wasOpen !== isOpen) this.#syncPositioner(isOpen);
    }

    #syncPositioner(isOpen: boolean) {
        this.#positioner?.destroy();
        this.#positioner = null;
        if (!isOpen) return;

        const elem = document.getElementById('cm-suggestions-panel') as HTMLDivElement | null;
        if (!elem) return;

        this.#positioner = createPanelPositioner({
            dock: elem,
            getVisible: () => true,
        });
    }

    destroy() {
        this.#positioner?.destroy();
    }
});

export function helpPanel() {
    return [
        helpPanelState,
        helpPanelFocusSync,
        HelpPanelViewPlugin,
    ]
}

