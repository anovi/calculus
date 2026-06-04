import { readFileSync, writeFileSync } from 'node:fs'

const parserPath = 'src/language/baseline/calculus-language.ts'
const marker = '// @ts-nocheck\n'
const source = readFileSync(parserPath, 'utf8')

if (!source.startsWith(marker)) {
  writeFileSync(parserPath, marker + source)
}
