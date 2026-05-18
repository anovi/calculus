import assert from 'node:assert';

import { normalizeUnit } from './unit-name-normalizer';


describe('normalizeUnit', () => {
  it('returns canonical abbr', () => {
    assert.strictEqual(normalizeUnit('KM'), 'km');
    assert.strictEqual(normalizeUnit('eur'), 'EUR');
  });
});
