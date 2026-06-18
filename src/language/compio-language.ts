import { LRLanguage, LanguageSupport } from '@codemirror/language'

import { parser } from './baseline/compio-language-parser'

export const calcLanguage = LRLanguage.define({
  name: 'compio',
  parser,
  languageData: {
    commentTokens: { line: '//' },
  },
})

export function compio(): LanguageSupport {
  return new LanguageSupport(calcLanguage)
}
