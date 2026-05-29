import Decimal from 'decimal.js';
import { describe, expect, it } from 'vitest';

import { CalcValue } from '../calculator';
import { formatCalcSuffix, formatResult } from './calc-result-format';
import { getCurrencyDecimalPlaces } from '../units';

function calc(result: Decimal, unit?: string): CalcValue {
    return new CalcValue(result, undefined, undefined, unit);
}

describe('getCurrencyDecimalPlaces', () => {
    it('maps numberToBasic to fractional digits', () => {
        expect(getCurrencyDecimalPlaces('USD')).toBe(2);
        expect(getCurrencyDecimalPlaces('usd')).toBe(2);
        expect(getCurrencyDecimalPlaces('BHD')).toBe(3);
        expect(getCurrencyDecimalPlaces('ZiG')).toBe(undefined);
    });
});

describe('formatResult', () => {
    it('rounds currencies to minor-unit precision', () => {
        expect(formatResult(calc(new Decimal('92.3456'), 'USD'))).toBe('92.35 USD');
        expect(formatResult(calc(new Decimal('1.2349'), 'BHD'))).toBe('1.235 BHD');
    });

    it('rounds physical units by measure kind', () => {
        expect(formatResult(calc(new Decimal('1.23456789'), 'km'))).toBe('1.2346 km');
        expect(formatResult(calc(new Decimal('20.456'), 'C'))).toBe('20.46 C');
        expect(formatResult(calc(new Decimal('1.2345'), 'L'))).toBe('1.235 L');
    });

    it('uses fewer fractional digits for large magnitudes', () => {
        expect(formatResult(calc(new Decimal('1234.56789'), 'km'))).toBe('1234.57 km');
        expect(formatResult(calc(new Decimal('1234567.89'), 'km'))).toBe('1234568 km');
    });

    it('uses six fractional digits for unitless values', () => {
        expect(formatResult(calc(new Decimal('1.23456789')))).toBe('1.234568');
    });

    it('shows small time conversions without rounding to zero', () => {
        expect(formatResult(calc(new Decimal('0.0002'), 'min'))).toBe('0.0002 min');
    });

    it('appends unit when present', () => {
        expect(formatResult(calc(new Decimal(26), 'USD'))).toBe('26 USD');
    });
});

describe('formatCalcSuffix', () => {
    it('prefixes formatted value with equals sign', () => {
        expect(formatCalcSuffix(calc(new Decimal('10.999'), 'EUR'))).toBe('= 11 EUR');
    });

    it('returns error suffix without formatting number', () => {
        const value = new CalcValue(new Decimal(0), undefined, undefined, undefined, 'bad');
        expect(formatCalcSuffix(value)).toBe('= Error');
    });
});
