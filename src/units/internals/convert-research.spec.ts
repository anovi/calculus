import assert from 'node:assert';
import Decimal from 'decimal.js';

import { convert, convertPackageUnitsConverter } from './convert-package';
import { convertLibUnitsConverter, convertUnits } from './convert-units-package';

/** `convert` package (used as calculator baseline). */
const CONVERT_KM_TO_MI_10 = 6.2137119223733395;
/** `convert-units` uses a slightly different mile/km ratio. */
const CONVERT_UNITS_KM_TO_MI_10 = 6.213712121212121; // ⚠️ Wrong result

describe('unit conversion libraries (research)', () => {
  it('convert-units exposes possibilities for compound units', () => {
    const possibilities = convertUnits(4).from('min/km').possibilities();
    assert.ok(possibilities.length > 0);
  });

  it('convert-units converts km to mi', () => {
    assert.strictEqual(convertUnits(10).from('km').to('mi'), CONVERT_UNITS_KM_TO_MI_10);
  });

  it('convert package converts km to mi', () => {
    assert.strictEqual(convert(10, 'km').to('mi'), CONVERT_KM_TO_MI_10);
  });

  it('UnitsConverter implementations match their respective libraries', () => {
    const value = new Decimal(10);
    assert.strictEqual(
      convertLibUnitsConverter.convertValue(value, 'km', 'mi').toNumber(),
      CONVERT_UNITS_KM_TO_MI_10,
    );
    assert.strictEqual(
      convertPackageUnitsConverter.convertValue(value, 'km', 'mi').toNumber(),
      CONVERT_KM_TO_MI_10,
    );
  });

  describe('Decimal manual conversion paths', () => {
    it('uses mile/km ratio directly (matches convert package)', () => {
      const miles = new Decimal(1)
        .div(new Decimal(1.609344))
        .mul(new Decimal(10))
        .toNumber();
      assert.strictEqual(miles, CONVERT_KM_TO_MI_10);
    });

    it('chains meters through feet to miles (matches convert-unites package)', () => {
      const miles = new Decimal(10000)
        .mul(new Decimal(3.28084))
        .div(new Decimal(5280))
        .toNumber();
      assert.ok(Math.abs(miles - CONVERT_KM_TO_MI_10) < 1e-6);
    });

    it('reverses convert-units miles back to km (approximate)', () => {
      const km = new Decimal(CONVERT_UNITS_KM_TO_MI_10)
        .mul(new Decimal(1.609344))
        .toNumber();
      assert.ok(Math.abs(km - 10) < 1e-6);
    });

    it('uses canonical meters-per-mile (matches convert package)', () => {
      const miles = new Decimal(10000)
        .div(new Decimal(1609.344))
        .toNumber();
      assert.strictEqual(miles, CONVERT_KM_TO_MI_10);
    });
  });
});
