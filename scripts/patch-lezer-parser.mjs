import { readFileSync, writeFileSync } from 'node:fs'

const parserPath = 'src/language/baseline/calculus-language-parser.ts'
const marker = '// @ts-nocheck\n'
const source = readFileSync(parserPath, 'utf8')

if (!source.startsWith(marker)) {
  writeFileSync(parserPath, marker + source)
}

const termsPath = 'src/language/baseline/calculus-language-parser.terms.ts'
const termsMarker = '// @ts-nocheck\n'
const termsSource = readFileSync(termsPath, 'utf8')

if (!termsSource.startsWith(termsMarker)) {
  writeFileSync(termsPath, termsMarker + termsSource)
}
