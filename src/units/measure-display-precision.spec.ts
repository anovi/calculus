import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';

import { MeasureKind } from './internals/convert-package';
import {
	ALL_MEASURE_KINDS,
	MAX_DECIMAL_PLACES_BY_MEASURE_KIND,
	getMeasureDecimalPlaces,
	getMeasureDisplayDecimalPlaces,
	magnitudeAwareDecimalPlaces,
} from './measure-display-precision';

describe('MAX_DECIMAL_PLACES_BY_MEASURE_KIND', () => {
	it('defines a positive cap for every convert MeasureKind', () => {
		for (const kind of ALL_MEASURE_KINDS) {
			const places = MAX_DECIMAL_PLACES_BY_MEASURE_KIND[kind];
			expect(places, MeasureKind[kind]).toBeGreaterThanOrEqual(0);
			expect(Number.isInteger(places)).toBe(true);
		}
		expect(ALL_MEASURE_KINDS).toHaveLength(16);
	});
});

describe('getMeasureDecimalPlaces', () => {
	it('resolves units by kind', () => {
		expect(getMeasureDecimalPlaces('km')).toBe(4);
		expect(getMeasureDecimalPlaces('KM')).toBe(4);
		expect(getMeasureDecimalPlaces('C')).toBe(2);
		expect(getMeasureDecimalPlaces('L')).toBe(3);
	});

	it('returns undefined for unknown units', () => {
		expect(getMeasureDecimalPlaces('widgets')).toBeUndefined();
	});
});

describe('magnitudeAwareDecimalPlaces', () => {
	it('uses full kind cap near unit magnitude', () => {
		expect(magnitudeAwareDecimalPlaces(new Decimal('1.23456789'), 4)).toBe(4);
	});

	it('reduces fractional digits as magnitude grows', () => {
		expect(magnitudeAwareDecimalPlaces(new Decimal('1234.56789'), 4)).toBe(2);
		expect(magnitudeAwareDecimalPlaces(new Decimal('1234567.89'), 4)).toBe(0);
	});

	it('never exceeds the per-kind cap', () => {
		expect(magnitudeAwareDecimalPlaces(new Decimal('0.0000123456'), 4)).toBe(4);
	});
});

describe('getMeasureDisplayDecimalPlaces', () => {
	it('combines kind cap with magnitude', () => {
		expect(getMeasureDisplayDecimalPlaces(new Decimal('1.23456789'), 'km')).toBe(4);
		expect(getMeasureDisplayDecimalPlaces(new Decimal('1234.56789'), 'km')).toBe(2);
	});
});
