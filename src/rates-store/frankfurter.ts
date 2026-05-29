import { isCurrencyCode, type CurrencyCode } from '../units';
import type { PairEntry } from './types';

const API_BASE = "https://api.frankfurter.dev/v2/rates";

/** Shape of a single row in the Frankfurter v2 response. */
type RateRow = {
	date: string;
	base: string;
	quote: string;
	rate: number;
};

/** One quote returned by {@link fetchBaseRates}, normalized for the store. */
export type BaseRateRow = {
	quote: CurrencyCode;
	rate: number;
	date: string;
};

function buildUrl(base: CurrencyCode, quotes: readonly CurrencyCode[]): string {
	const params = new URLSearchParams({
		base: base.toUpperCase(),
		quotes: quotes.map((q) => q.toUpperCase()).join(","),
	});
	return `${API_BASE}?${params.toString()}`;
}

function isRateRow(value: unknown): value is RateRow {
	if (value === null || typeof value !== "object") return false;
	const row = value as Record<string, unknown>;
	return (
		typeof row.date === "string" &&
		typeof row.base === "string" &&
		typeof row.quote === "string" &&
		typeof row.rate === "number" &&
		Number.isFinite(row.rate)
	);
}

async function fetchRows(url: string): Promise<RateRow[]> {
	const res = await fetch(url, { cache: "default" });
	if (!res.ok) {
		throw new Error(`Frankfurter request failed (${res.status})`);
	}
	const data: unknown = await res.json();
	if (!Array.isArray(data)) {
		throw new Error("Unexpected Frankfurter response shape");
	}
	const rows: RateRow[] = [];
	for (const row of data) {
		if (!isRateRow(row)) {
			throw new Error("Malformed Frankfurter rate row");
		}
		rows.push(row);
	}
	if (rows.length === 0) {
		throw new Error("Frankfurter returned no rates");
	}
	return rows;
}

/** Fetch a single directional pair (1 `from` = X `to`). */
export async function fetchPair(
	from: CurrencyCode,
	to: CurrencyCode,
): Promise<PairEntry> {
	const rows = await fetchRows(buildUrl(from, [to]));
	const row = rows[0];
	return { rate: row.rate, date: row.date, fetchedAt: Date.now() };
}

/** Fetch many quotes against a single base in one request. Returns one row per quote returned by the API. */
export async function fetchBaseRates(
	base: CurrencyCode,
	quotes: readonly CurrencyCode[],
): Promise<BaseRateRow[]> {
	const filtered = quotes.filter((q) => q.toUpperCase() !== base.toUpperCase());
	if (filtered.length === 0) return [];
	const rows = await fetchRows(buildUrl(base, filtered));
	const out: BaseRateRow[] = [];
	for (const row of rows) {
		const quote = row.quote.toUpperCase();
		if (!isCurrencyCode(quote)) continue;
		out.push({ quote, rate: row.rate, date: row.date });
	}
	return out;
}
