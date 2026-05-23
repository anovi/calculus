/** Minimal Virtual Keyboard API surface (Chrome Android; not in all TS libs). */
interface VirtualKeyboard {
    readonly boundingRect: DOMRectReadOnly;
    overlaysContent: boolean;
    addEventListener(type: 'geometrychange', listener: (e: Event) => void): void;
    removeEventListener(type: 'geometrychange', listener: (e: Event) => void): void;
}

type PanelKeyboardLayout = 'virtual-keyboard-api' | 'visual-viewport';

function getVirtualKeyboard(): VirtualKeyboard | null {
    if (!('virtualKeyboard' in navigator)) return null;
    return (navigator as Navigator & { virtualKeyboard: VirtualKeyboard }).virtualKeyboard;
}

function resolvePanelKeyboardLayout(): PanelKeyboardLayout {
    return getVirtualKeyboard() ? 'virtual-keyboard-api' : 'visual-viewport';
}

/**
 * WebKit / iOS: distance from the layout viewport bottom to the visual viewport bottom.
 * Equals the on-screen keyboard height when the keyboard is open.
 *
 * Do not subtract visualViewport.offsetTop. When the caret sits below the keyboard,
 * Safari raises offsetTop to scroll the focused line into view and shifts layout-fixed
 * UI with that pan; subtracting offsetTop again pushes the panel under the keyboard.
 */
function keyboardInsetFromVisualViewport(): number {
    const vv = window.visualViewport;
    if (!vv) return 0;
    return Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
}

export type PanelPositionerOptions = {
    dock: HTMLElement;
    getVisible: () => boolean;
    visibleClass?: string;
};

export type PanelPositioner = {
    destroy: () => void;
    scheduleSync: () => void;
};

// Mobile panel keyboard layout: one strategy per browser, not both.
// - virtual-keyboard-api (Chrome Android): overlaysContent=false shrinks layout so
//   fixed bottom:0 sits above the keyboard; geometrychange drives visibility.
// - visual-viewport (iOS Safari): visualViewport resize/scroll + bottom inset.
export function createPanelPositioner(options: PanelPositionerOptions): PanelPositioner {
    const {
        dock,
        getVisible,
        visibleClass = 'cm-suggestions-panel--visible',
    } = options;

    const layout = resolvePanelKeyboardLayout();
    const virtualKeyboard = layout === 'virtual-keyboard-api' ? getVirtualKeyboard() : null;

    let rafId: number | null = null;
    const followUpTimers: ReturnType<typeof setTimeout>[] = [];

    function panelBottomInset(): number {
        if (layout === 'virtual-keyboard-api') {
            return 0;
        }
        return keyboardInsetFromVisualViewport();
    }

    function applySync() {
        const visible = getVisible();
        const inset = panelBottomInset();
        console.log('inset', inset);
        dock.style.bottom = `${inset}px`;
        dock.classList.toggle(visibleClass, visible);
        dock.setAttribute('aria-hidden', visible ? 'false' : 'true');
    }

    function cancelScheduledSync() {
        if (rafId !== null) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        for (const id of followUpTimers) clearTimeout(id);
        followUpTimers.length = 0;
    }

    function scheduleSync() {
        cancelScheduledSync();

        rafId = requestAnimationFrame(() => {
            rafId = null;
            applySync();
            requestAnimationFrame(() => applySync());
        });
    }

    function onKeyboardGeometryChange() {
        scheduleSync();
    }

    if (virtualKeyboard) {
        // false = browser resizes layout; content (and fixed panel) stay above keyboard.
        virtualKeyboard.overlaysContent = false;
    } else {
        const vv = window.visualViewport;
        document.addEventListener('gesturechange', onKeyboardGeometryChange);
        document.addEventListener('focusout', onKeyboardGeometryChange);
        vv?.addEventListener('resize', onKeyboardGeometryChange);
        vv?.addEventListener('scroll', onKeyboardGeometryChange);
    }

    scheduleSync();

    function destroy() {
        cancelScheduledSync();
        if (virtualKeyboard) {
            virtualKeyboard.removeEventListener(
                'geometrychange',
                onKeyboardGeometryChange,
            );
        } else {
            const vv = window.visualViewport;
            document.removeEventListener('gesturechange', onKeyboardGeometryChange);
            document.removeEventListener('focusout', onKeyboardGeometryChange);
            vv?.removeEventListener('resize', onKeyboardGeometryChange);
            vv?.removeEventListener('scroll', onKeyboardGeometryChange);
        }
    }

    return { destroy, scheduleSync };
}
