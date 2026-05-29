import { describe, expect, it } from 'vitest';

import { parseCurrenciesCsv } from './parse-currencies-csv';

const SAMPLE = `name,symbol,code,fractional_unit,number_to_basic
Abkhazian apsar,аԥ,,,
Euro,€,EUR,Cent,100
United States dollar,$,USD,Cent,100
United States dollar,$,USD,Cent,100
Bahraini dinar,BD,BHD,Fils,1000
`;

describe('parseCurrenciesCsv', () => {
	it('skips rows without a valid ISO code and dedupes by code', () => {
		const rows = parseCurrenciesCsv(SAMPLE);
		expect(rows.map((r) => r.code)).toEqual(['BHD', 'EUR', 'USD']);
	});

	it('parses minor-unit scale and optional fields', () => {
		const usd = parseCurrenciesCsv(SAMPLE).find((r) => r.code === 'USD');
		expect(usd).toMatchObject({
			name: 'United States dollar',
			symbol: '$',
			fractionalUnit: 'Cent',
			numberToBasic: 100,
		});
		const bhd = parseCurrenciesCsv(SAMPLE).find((r) => r.code === 'BHD');
		expect(bhd?.numberToBasic).toBe(1000);
	});
});
