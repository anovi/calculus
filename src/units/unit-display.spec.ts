import assert from 'node:assert';

import { formatUnitChoiceLabel, formatUnitFullName } from './unit-display';


describe('formatUnitChoiceLabel', () => {
  it('labels measurement units from MeasureEntry', () => {
    assert.match(formatUnitChoiceLabel('ms'), /\(ms\)$/);
    assert.match(formatUnitChoiceLabel('Ms'), /\(Ms\)$/);
    assert.notStrictEqual(formatUnitChoiceLabel('ms'), formatUnitChoiceLabel('Ms'));
  });

  it('labels currencies', () => {
    assert.strictEqual(formatUnitChoiceLabel('EUR'), 'Euro (EUR)');
  });
});

describe('formatUnitFullName', () => {
  it('returns primary name without abbreviation', () => {
    assert.strictEqual(formatUnitFullName('EUR'), 'Euro');
    assert.strictEqual(formatUnitFullName('usd'), 'United States dollar');
  });
});
