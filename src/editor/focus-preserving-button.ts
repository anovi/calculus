/** Finger movement above this is a scroll/swipe, not a panel button tap (iOS). */
const TAP_MOVE_THRESHOLD_PX = 10

type TouchTapStart = { x: number; y: number; scrollLeft: number }

function touchMovedBeyondTap(x: number, y: number, start: TouchTapStart): boolean {
  const dx = x - start.x
  const dy = y - start.y
  return Math.hypot(dx, dy) > TAP_MOVE_THRESHOLD_PX
}

/**
 * Runs `onclick` on tap/click without moving focus from the editor.
 * Optional `scrollContainer` ignores taps that scrolled a horizontal button row.
 */
export function bindFocusPreservingButton(
  element: HTMLButtonElement,
  onclick: () => void,
  scrollContainer?: HTMLElement,
): void {
  let touchStart: TouchTapStart | null = null
  let suppressClick = false

  element.addEventListener('mousedown', (e) => {
    e.preventDefault()
  })

  element.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) {
      touchStart = null
      return
    }
    const t = e.touches[0]
    touchStart = {
      x: t.clientX,
      y: t.clientY,
      scrollLeft: scrollContainer?.scrollLeft ?? 0,
    }
  }, { passive: true })

  element.addEventListener('touchmove', (e) => {
    if (!touchStart || e.touches.length !== 1) return
    const t = e.touches[0]
    if (touchMovedBeyondTap(t.clientX, t.clientY, touchStart)) {
      touchStart = null
    }
  }, { passive: true })

  element.addEventListener('touchend', (e) => {
    const start = touchStart
    touchStart = null
    if (!start) return

    const t = e.changedTouches[0]
    if (!t || touchMovedBeyondTap(t.clientX, t.clientY, start)) return
    if (
      scrollContainer &&
      Math.abs(scrollContainer.scrollLeft - start.scrollLeft) > 1
    ) {
      return
    }

    e.preventDefault()
    suppressClick = true
    onclick()
    element.blur()
  })

  element.addEventListener('click', (e) => {
    e.preventDefault()
    if (suppressClick) {
      suppressClick = false
      return
    }
    onclick()
    element.blur()
  })
}
