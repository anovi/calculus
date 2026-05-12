/**
 * Expands `Unit { "@@INJECT@@" }` in the inline-units grammar from
 * `src/language/currencies.ts`, then runs lezer-generator on the result.
 *
 * Run: node --experimental-strip-types scripts/generate-inline-units-lezer.ts
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCurrencyUnitAlternationBody } from '../src/language/inline-units/currency-unit-alternation.ts'

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const grammarPath = join(root, 'src/language/inline-units/calculus-language.grammar');
const outParser = join(root, 'src/language/inline-units/calculus-language.ts');
const lezerCli = join(root, 'node_modules/@lezer/generator/src/lezer-generator.cjs');

const marker = 'Unit { "@@INJECT@@" }';

const src = readFileSync(grammarPath, 'utf8');
if (!src.includes('@@INJECT@@')) {
	throw new Error(
		`${grammarPath}: expected Unit placeholder ${JSON.stringify(marker)} (from currencies at build time)`,
	);
}
const expanded = src.replace(marker, `Unit { ${buildCurrencyUnitAlternationBody()} }`);

const dir = mkdtempSync(join(tmpdir(), 'calc-inline-grammar-'));
const tmpGrammar = join(dir, 'calculus-inline.grammar');
try {
	writeFileSync(tmpGrammar, expanded);
	execFileSync(process.execPath, [lezerCli, tmpGrammar, '-o', outParser], {
		cwd: root,
		stdio: 'inherit',
	});
} finally {
	rmSync(dir, { recursive: true, force: true });
}
