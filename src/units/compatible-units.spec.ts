import assert from 'node:assert';

import { getCompatibleConvertUnits } from './compatible-units';

describe('getCompatibleConvertUnits', () => {
  it('currency converts only to currencies', () => {
    const pool = getCompatibleConvertUnits('EUR');
    assert.ok(pool.includes('USD'));
    assert.ok(!pool.includes('km'));
  });

  it('length converts within the same measure kind', () => {
    const pool = getCompatibleConvertUnits('km');
    assert.ok(pool.includes('mi'));
    assert.ok(!pool.some((u) => u === 'EUR' || u === 'USD'));
  });

  it('returns empty for unknown units', () => {
    assert.deepStrictEqual(getCompatibleConvertUnits('not_a_unit'), []);
  });
});
