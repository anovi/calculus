import { ViewPlugin, type Panel, type ViewUpdate } from "@codemirror/view";
import { EditorView } from "@codemirror/view";

import { createIconButton } from '../../components/icon-button';
import { isMobileDevice } from "../../lib/mobile-device";
import { bindFocusPreservingButton } from '../../components/focus-preserving-button';

import { ToggleToolbar } from "../effects"; 
import { toggleInlineFormat } from '../editor-commands';
import { OPERATION_ICON } from './operation-icons';
import { OperationsDictionary, type Operation, type OperationDef } from './operations-dictionary';
import { createPanelPositioner, type PanelPositioner } from "./panel-positioner";
import { helpPanelState } from "./state";


/*===============================================================================
=                                  Components                                   =
===============================================================================*/


function button(
    op: OperationDef,
    onclick: (op: OperationDef) => void,
    scrollContainer?: HTMLElement,
) {
    const dom = createIconButton({
        icon: OPERATION_ICON[op.operation],
        ariaLabel: op.operation,
    });
    dom.dataset.operation = op.operation;
    bindFocusPreservingButton(dom, onclick.bind(null, op), scrollContainer);
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
    bindFocusPreservingButton(btn, () => dismissEditorFocus(view));
    return btn;
}

function suggestionPanel(view: EditorView) {
    const dom = document.createElement("div");
    dom.className = "cm-help-panel";
    dom.id = "cm-suggestions-panel";
    dom.setAttribute('aria-hidden', 'true');

    const dismissBtn = dismissKeyboardButton(view);

    const buttonsEl = document.createElement('div');
    buttonsEl.classList.add('suggestion-panel-buttons');
    
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
 * Dispatches a ToggleToolbar effect when the editor's focus changes.
 */
const helpPanelFocusSync = EditorView.updateListener.of((update) => {
    if (!update.focusChanged) return;
    const show = update.view.hasFocus;
    if (update.state.field(helpPanelState) === show) return;
    update.view.dispatch({ effects: ToggleToolbar.of(show) });
});

/** Extra space kept between the selection and the fixed suggestions panel. */
const PANEL_SCROLL_PADDING_PX = 8;

function ensureSelectionAbovePanel(view: EditorView) {
    if (!view.hasFocus || !view.state.field(helpPanelState)) return;

    const panel = document.getElementById('cm-suggestions-panel');
    if (!panel?.classList.contains('cm-suggestions-panel--visible')) return;

    const head = view.state.selection.main.head;
    const coords = view.coordsAtPos(head);
    if (!coords) return;

    const panelTop = panel.getBoundingClientRect().top;
    if (coords.bottom <= panelTop - PANEL_SCROLL_PADDING_PX) return;

    view.scrollDOM.scrollTop += coords.bottom - panelTop + PANEL_SCROLL_PADDING_PX;
}

function scheduleEnsureSelectionAbovePanel(view: EditorView) {
    requestAnimationFrame(() => {
        ensureSelectionAbovePanel(view);
        requestAnimationFrame(() => ensureSelectionAbovePanel(view));
    });
}

/**
 * The plugin creates positioner for a panel while panel is active.
 * And destroys positioner when panel hides. It only does syncing.
 */
const HelpPanelViewPlugin = ViewPlugin.fromClass(class HelpPanelView {
    #positioner: PanelPositioner | null = null;
    #view: EditorView;

    constructor(view: EditorView) {
        this.#view = view;
        this.#syncPositioner(false);
    }

    update(update: ViewUpdate) {
        const wasOpen = update.startState.field(helpPanelState);
        const isOpen = update.state.field(helpPanelState);
        if (wasOpen !== isOpen) {
            this.#syncPositioner(isOpen);
            if (isOpen) scheduleEnsureSelectionAbovePanel(update.view);
        } else if (isOpen && (update.selectionSet || update.focusChanged)) {
            scheduleEnsureSelectionAbovePanel(update.view);
        }
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
            onAfterSync: () => scheduleEnsureSelectionAbovePanel(this.#view),
        });
    }

    destroy() {
        this.#positioner?.destroy();
    }
});

export function helpPanel() {
    if (!isMobileDevice()) return [];

    return [
        helpPanelState,
        helpPanelFocusSync,
        HelpPanelViewPlugin,
    ]
}

