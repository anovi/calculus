import type { CurrencyEntry } from "./types";

const ISO_CODE = /^[A-Z]{3}$/;

/** Parse CSV text (header: name,symbol,code,fractional_unit,number_to_basic). */
export function parseCurrenciesCsv(csvText: string): readonly CurrencyEntry[] {
	const lines = csvText.split(/\r?\n/).filter((line) => line.length > 0);
	if (lines.length === 0) return [];

	const byCode = new Map<string, CurrencyEntry>();

	for (let i = 1; i < lines.length; i++) {
		const row = parseCsvRow(lines[i]);
		if (!row) continue;

		const code = row.code.trim().toUpperCase();
		if (!ISO_CODE.test(code)) continue;
		if (byCode.has(code)) continue;

		const numberToBasicRaw = row.numberToBasic.trim();
		const symbol = row.symbol.trim();
		const fractionalUnit = row.fractionalUnit.trim();
		let numberToBasic: number | undefined;
		if (numberToBasicRaw) {
			const n = Number(numberToBasicRaw);
			if (Number.isFinite(n) && n > 0) numberToBasic = n;
		}

		byCode.set(code, {
			code,
			name: row.name.trim(),
			...(symbol ? { symbol } : {}),
			...(fractionalUnit ? { fractionalUnit } : {}),
			...(numberToBasic !== undefined ? { numberToBasic } : {}),
		});
	}

	return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function parseCsvRow(line: string): {
	name: string;
	symbol: string;
	code: string;
	fractionalUnit: string;
	numberToBasic: string;
} | null {
	const parts = line.split(',');
	if (parts.length < 5) return null;

	const numberToBasic = parts.pop()!;
	const fractionalUnit = parts.pop()!;
	const code = parts.pop()!;
	const symbol = parts.pop()!;
	const name = parts.join(',');

	return { name, symbol, code, fractionalUnit, numberToBasic };
}
