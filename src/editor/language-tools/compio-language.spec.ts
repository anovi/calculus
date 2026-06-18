import assert from 'node:assert'
import { EditorSelection, EditorState } from '@codemirror/state'
import { toggleComment } from '@codemirror/commands'

import { calcLanguage } from '../../language'

function dispatchToggle(state: EditorState): EditorState {
  let next = state
  toggleComment({
    state,
    dispatch(tr) {
      next = tr.state
    },
  })
  return next
}

describe('toggleComment', () => {
  it('comments the current line', () => {
    const state = EditorState.create({
      doc: 'a = 1',
      selection: EditorSelection.cursor(0),
      extensions: [calcLanguage],
    })
    const next = dispatchToggle(state)
    assert.strictEqual(next.doc.toString(), '// a = 1')
  })

  it('uncomments the current line', () => {
    const state = EditorState.create({
      doc: '// a = 1',
      selection: EditorSelection.cursor(0),
      extensions: [calcLanguage],
    })
    const next = dispatchToggle(state)
    assert.strictEqual(next.doc.toString(), 'a = 1')
  })

  it('comments all lines touched by the selection', () => {
    const state = EditorState.create({
      doc: 'a = 1\nb = 2\nc = 3',
      selection: EditorSelection.range(0, 7),
      extensions: [calcLanguage],
    })
    const next = dispatchToggle(state)
    assert.strictEqual(next.doc.toString(), '// a = 1\n// b = 2\nc = 3')
  })
})
