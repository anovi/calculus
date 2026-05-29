/**
 * Body of the Lezer `Unit { ... }` token rule: string literals joined by `|`,
 * built from ISO currency codes with lowercase, uppercase, and title-case variants.
 *
 * Accepts codes as an argument so Vite config can call this without `__CURRENCIES__`
 * (that global is only defined for app bundles via `define`).
 */
export function buildCurrencyUnitAlternationBody(currencyCodes: readonly string[]): string {
	const variants = new Set<string>();
	for (const code of currencyCodes) {
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
