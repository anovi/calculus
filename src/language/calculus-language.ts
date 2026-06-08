import { LRLanguage, LanguageSupport } from '@codemirror/language'

import { parser } from './baseline/calculus-language-parser'

export const calcLanguage = LRLanguage.define({
  name: 'calculus',
  parser,
  languageData: {
    commentTokens: { line: '//' },
  },
})

export function calculus(): LanguageSupport {
  return new LanguageSupport(calcLanguage)
}
