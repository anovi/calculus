import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { EditorView } from '@codemirror/view'

import {
  TOOLBAR_HEIGHT,
  bottomPanelTopInset,
  computeEditorTooltipSpace,
  keyboardInsetFromVisualViewport,
  visualViewportBottom,
} from './viewport-insets'

vi.mock('../lib/mobile-device', () => ({
  isMobileDevice: vi.fn(() => false),
}))

import { isMobileDevice } from '../lib/mobile-device'

const mockIsMobileDevice = vi.mocked(isMobileDevice)

type TestGlobals = typeof globalThis & {
  window: Window & typeof globalThis
  document: Document
}

function setTestGlobals(vv: Partial<VisualViewport> | null, clientHeight = 800) {
  const g = globalThis as TestGlobals
  g.window = {
    visualViewport: vv as VisualViewport | null,
  } as Window & typeof globalThis
  g.document = {
    documentElement: { clientHeight },
  } as Document
}

function mockView(scroll: DOMRectReadOnly, hasFocus: boolean): EditorView {
  return {
    scrollDOM: {
      getBoundingClientRect: () => scroll,
    },
    hasFocus,
  } as unknown as EditorView
}

describe('keyboardInsetFromVisualViewport', () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
    delete (globalThis as { document?: unknown }).document
  })

  it('returns 0 when visualViewport is unavailable', () => {
    setTestGlobals(null)
    expect(keyboardInsetFromVisualViewport()).toBe(0)
  })

  it('returns height + offsetTop when keyboard shrinks the viewport', () => {
    setTestGlobals({ height: 400, offsetTop: 20 })
    expect(keyboardInsetFromVisualViewport()).toBe(420)
  })
})

describe('bottomPanelTopInset', () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
    delete (globalThis as { document?: unknown }).document
  })

  it('subtracts toolbar height from keyboard inset', () => {
    setTestGlobals({ height: 500, offsetTop: 100 })
    expect(bottomPanelTopInset()).toBe(500 + 100 - TOOLBAR_HEIGHT)
  })
})

describe('visualViewportBottom', () => {
  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
    delete (globalThis as { document?: unknown }).document
  })

  it('falls back to document client height', () => {
    setTestGlobals(null, 800)
    expect(visualViewportBottom()).toBe(800)
  })

  it('uses visual viewport bottom edge', () => {
    setTestGlobals({ height: 400, offsetTop: 50 })
    expect(visualViewportBottom()).toBe(450)
  })
})

describe('computeEditorTooltipSpace', () => {
  const scrollRect = {
    top: 48,
    left: 12,
    right: 388,
    bottom: 700,
    width: 376,
    height: 652,
    x: 12,
    y: 48,
    toJSON: () => ({}),
  } as DOMRect

  beforeEach(() => {
    mockIsMobileDevice.mockReturnValue(false)
    setTestGlobals({ height: 700, offsetTop: 0 }, 700)
  })

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window
    delete (globalThis as { document?: unknown }).document
  })

  it('uses scrollDOM edges for top and horizontal bounds on desktop', () => {
    const space = computeEditorTooltipSpace(mockView(scrollRect, true))
    expect(space).toEqual({
      top: 48,
      left: 12,
      bottom: 700,
      right: 388,
    })
  })

  it('does not cap bottom on desktop even when focused', () => {
    setTestGlobals({ height: 700, offsetTop: 0 }, 700)
    const space = computeEditorTooltipSpace(mockView(scrollRect, true))
    expect(space.bottom).toBe(700)
  })

  it('caps bottom at bottom panel top on mobile when editor is focused', () => {
    mockIsMobileDevice.mockReturnValue(true)
    setTestGlobals({ height: 500, offsetTop: 0 }, 500)
    const space = computeEditorTooltipSpace(mockView(scrollRect, true))
    expect(space.bottom).toBe(500 - TOOLBAR_HEIGHT)
  })

  it('does not cap bottom on mobile when editor is unfocused', () => {
    mockIsMobileDevice.mockReturnValue(true)
    setTestGlobals({ height: 500, offsetTop: 0 }, 500)
    const space = computeEditorTooltipSpace(mockView(scrollRect, false))
    expect(space.bottom).toBe(500)
  })

  it('uses the smaller of visual viewport bottom and panel top on mobile', () => {
    mockIsMobileDevice.mockReturnValue(true)
    setTestGlobals({ height: 600, offsetTop: 0 }, 600)
    const space = computeEditorTooltipSpace(mockView(scrollRect, true))
    expect(space.bottom).toBe(Math.min(600, 600 - TOOLBAR_HEIGHT))
  })
})
