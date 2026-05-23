/** Minimal Virtual Keyboard API surface (Chrome Android; not in all TS libs). */
interface VirtualKeyboard {
    readonly boundingRect: DOMRectReadOnly;
    addEventListener(type: 'geometrychange', listener: (e: Event) => void): void;
    removeEventListener(type: 'geometrychange', listener: (e: Event) => void): void;
}

function getVirtualKeyboard(): VirtualKeyboard | null {
    if (!('virtualKeyboard' in navigator)) return null;
    return (navigator as Navigator & { virtualKeyboard: VirtualKeyboard }).virtualKeyboard;
}

const TOOLBAR_HEIGHT = 48;

/**
 * Distance from the layout viewport bottom to the visual viewport bottom.
 * On Chrome Android (default `interactive-widget=resizes-visual`) the layout
 * viewport does not shrink when the keyboard opens, but visualViewport.height does.
 * Fixed `bottom: 0` elements must offset by this value to sit above the keyboard.
 *
 * Do not subtract visualViewport.offsetTop on iOS: when the caret is below the
 * keyboard, Safari raises offsetTop to scroll the focused line into view; subtracting
 * it again pushes fixed UI under the keyboard.
 */
function keyboardInsetFromVisualViewport(): number {
    const vv = window.visualViewport;
    if (!vv) return 0;
    return Math.max(0, vv.height + vv.offsetTop);
}

// function keyboardInsetFromVirtualKeyboard(): number {
//     const vk = getVirtualKeyboard();
//     if (!vk) return 0;
//     return Math.max(0, vk.boundingRect.height);
// }

function panelBottomInset(): number {
    return Math.max(
        keyboardInsetFromVisualViewport(),
        // keyboardInsetFromVirtualKeyboard(),
    ) - TOOLBAR_HEIGHT;
}

export type PanelPositionerOptions = {
    dock: HTMLElement;
    getVisible: () => boolean;
    visibleClass?: string;
    onAfterSync?: () => void;
};

export type PanelPositioner = {
    destroy: () => void;
    scheduleSync: () => void;
};

export function createPanelPositioner(options: PanelPositionerOptions): PanelPositioner {
    const {
        dock,
        getVisible,
        visibleClass = 'cm-suggestions-panel--visible',
        onAfterSync,
    } = options;

    const virtualKeyboard = getVirtualKeyboard();

    let rafId: number | null = null;

    function applySync() {
        const visible = getVisible();
        const inset = panelBottomInset();
        dock.style.top = `${inset}px`;
        dock.classList.toggle(visibleClass, visible);
        dock.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }

    function cancelScheduledSync() {
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
    }

    function scheduleSync() {
        cancelScheduledSync();

        rafId = requestAnimationFrame(() => {
            rafId = null;
            applySync();
            requestAnimationFrame(() => {
                applySync();
                onAfterSync?.();
            });
        });
    }

    function onKeyboardGeometryChange() {
        scheduleSync();
    }

    const vv = window.visualViewport;
    vv?.addEventListener('resize', onKeyboardGeometryChange);
    vv?.addEventListener('scroll', onKeyboardGeometryChange);
    virtualKeyboard?.addEventListener('geometrychange', onKeyboardGeometryChange);

    scheduleSync();

    function destroy() {
        cancelScheduledSync();
        vv?.removeEventListener('resize', onKeyboardGeometryChange);
        vv?.removeEventListener('scroll', onKeyboardGeometryChange);
        virtualKeyboard?.removeEventListener('geometrychange', onKeyboardGeometryChange);
    }

    return { destroy, scheduleSync };
}
