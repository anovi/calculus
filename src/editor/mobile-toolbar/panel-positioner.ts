import {
  bottomPanelTopInset,
  getVirtualKeyboard,
} from '../viewport-insets'

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
        const inset = bottomPanelTopInset();
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
