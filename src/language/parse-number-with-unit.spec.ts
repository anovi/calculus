import assert from 'node:assert';

import { normalizeUnit } from './parse-number-with-unit';


describe('normalizeUnit', () => {
  it('returns canonical abbr', () => {
    assert.strictEqual(normalizeUnit('KM'), 'km');
    assert.strictEqual(normalizeUnit('eur'), 'EUR');
  });
});
