import { CURRENCIES } from '../currencies.ts'

/**
 * Body of the Lezer `Unit { ... }` token rule: string literals joined by `|`,
 * built from {@link CURRENCIES} with lowercase, uppercase, and title-case variants.
 */
export function buildCurrencyUnitAlternationBody(): string {
	const variants = new Set<string>();
	for (const code of CURRENCIES) {
		const upper = code;
		variants.add(upper);
		variants.add(code.toLowerCase());
		variants.add(code.charAt(0) + code.slice(1).toLowerCase());
	}
	return [...variants]
		.sort((a, b) => a.localeCompare(b))
		.map((s) => JSON.stringify(s))
		.join(' | ');
}
