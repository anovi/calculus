import assert from 'node:assert';

import { normalizeUnit, parseNumberWithUnit } from './parse-number-with-unit';

describe('parseNumberWithUnit', () => {
  it('parses currency without space', () => {
    assert.deepStrictEqual(parseNumberWithUnit('100USD'), { value: 100, unit: 'USD' });
  });

  it('parses currency with space', () => {
    assert.deepStrictEqual(parseNumberWithUnit('12.5 EUR'), { value: 12.5, unit: 'EUR' });
  });

  it('parses physical units case-insensitively', () => {
    assert.deepStrictEqual(parseNumberWithUnit('10 km'), { value: 10, unit: 'km' });
    assert.deepStrictEqual(parseNumberWithUnit('5S'), { value: 5, unit: 's' });
  });

  it('returns null for unknown suffix', () => {
    assert.strictEqual(parseNumberWithUnit('42 xyz'), null);
  });
});

describe('normalizeUnit', () => {
  it('returns canonical abbr', () => {
    assert.strictEqual(normalizeUnit('KM'), 'km');
    assert.strictEqual(normalizeUnit('eur'), 'EUR');
  });
});
