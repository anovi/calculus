import { isCurrencyCode, type CurrencyCode, type PairKey } from "./types";

const SEPARATOR = "->";

/** Build a canonical pair key. Inputs are uppercased so casing never produces duplicate entries. */
export function pairKey(from: CurrencyCode, to: CurrencyCode): PairKey {
	return `${from.toUpperCase()}${SEPARATOR}${to.toUpperCase()}`;
}

/** Inverse of {@link pairKey}. Returns null for any input that does not look like `"FROM->TO"`. */
export function parsePairKey(
	key: PairKey,
): { from: CurrencyCode; to: CurrencyCode } | null {
	const idx = key.indexOf(SEPARATOR);
	if (idx <= 0 || idx === key.length - SEPARATOR.length) return null;
	const from = key.slice(0, idx).toUpperCase();
	const to = key.slice(idx + SEPARATOR.length).toUpperCase();
	if (!isCurrencyCode(from) || !isCurrencyCode(to)) return null;
	return { from, to };
}
