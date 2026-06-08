import { LRLanguage } from '@codemirror/language'
import { EditorState } from '@codemirror/state'
import { describe, expect, it } from 'vitest'

import { parser } from '../../language'
import { calcRanges } from '../values-field'
import { calcValueForVariableName } from './variable-tooltip'

const calcLanguage = LRLanguage.define({ name: 'calculus', parser })

function stateWithDoc(doc: string): EditorState {
  return EditorState.create({ doc, extensions: [calcLanguage, calcRanges()] })
}

describe('calcValueForVariableName', () => {
  it('returns the latest binding before the reference', () => {
    const doc = 'a = 1\nb = 2\na + b'
    const state = stateWithDoc(doc)
    const aUse = doc.indexOf('a +')
    const value = calcValueForVariableName(state, 'a', aUse)
    expect(value?.name).toBe('a')
    expect(value?.result.toNumber()).toBe(1)
  })

  it('returns null when the variable is not defined', () => {
    const doc = 'x + 1'
    const state = stateWithDoc(doc)
    const xPos = doc.indexOf('x')
    const value = calcValueForVariableName(state, 'x', xPos)
    expect(value).toBeNull()
  })

  it('ignores bindings on the same line after the reference', () => {
    const doc = 'y = x + 1\nx = 5'
    const state = stateWithDoc(doc)
    const xInFirst = doc.indexOf('x')
    const value = calcValueForVariableName(state, 'x', xInFirst)
    expect(value).toBeNull()
  })
})
