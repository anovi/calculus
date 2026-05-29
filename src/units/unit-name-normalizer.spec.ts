import assert from 'node:assert';

import { normalizeUnit } from './unit-name-normalizer';


describe('normalizeUnit', () => {
  it('returns canonical abbr', () => {
    assert.strictEqual(normalizeUnit('KM'), 'km');
    assert.strictEqual(normalizeUnit('eur'), 'EUR');
  });

  it('returns multiple variants on ambiguity', () => {
    assert.strictEqual(normalizeUnit('ms'), 'ms');
    assert.deepStrictEqual(normalizeUnit('MS'), ['Ms', 'ms']);
    assert.strictEqual(normalizeUnit('Ms'), 'Ms');
  });
});
