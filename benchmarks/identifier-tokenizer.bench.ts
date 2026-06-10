import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { bench, describe } from 'vitest';

import { parser as srcParser } from '../src/language/baseline/calculus-language-parser';
import { parser as tokenizerInitial } from '../src/language/external-identifiers-initial/calculus-language-parser';
import { parser as tokenizerImroved } from '../src/language/external-identifiers-improved/calculus-language-parser';

const benchDir = dirname(fileURLToPath(import.meta.url));
const doc = readFileSync(
	join(benchDir, 'fixtures/identifier-benchmark-doc.txt'),
	'utf8',
);

const configuredSrcParser = srcParser.configure({});
const configuredTokenizerInitial = tokenizerInitial.configure({});
const configuredTokenizerImroved = tokenizerImroved.configure({});

/** Repeat full-document parses so tinybench has enough work per iteration. */
const PARSE_REPEATS = 200;

describe(`identifier tokenizer — full document parse (${PARSE_REPEATS}×)`, () => {
	bench('Baseline — grammar Identifier tokens', () => {
		for (let i = 0; i < PARSE_REPEATS; i++) {
			configuredSrcParser.parse(doc);
		}
	});

	bench('Tok1 — external identifier tokenizer', () => {
		for (let i = 0; i < PARSE_REPEATS; i++) {
			configuredTokenizerInitial.parse(doc);
		}
	});
	bench('Tok2 — external identifier tokenizer IMPROVED', () => {
		for (let i = 0; i < PARSE_REPEATS; i++) {
			configuredTokenizerImroved.parse(doc);
		}
	});
});
