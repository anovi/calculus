import { getCurrencies } from './currency';
import { getMeasurementUnits } from './unit-converter';
import type { MeasureEntry } from './types';

const measureEntryBySpelling = new Map<string, MeasureEntry>();

for (const entry of getMeasurementUnits()) {
  for (const spelling of [...entry.names, ...(entry.symbols ?? [])]) {
    measureEntryBySpelling.set(spelling, entry);
  }
}

const currencyNameByCode = new Map(
  getCurrencies().map((c) => [c.code, c.name] as const),
);

/** Human-readable label for a canonical unit spelling, e.g. `milliseconds (ms)`. */
export function formatUnitChoiceLabel(spelling: string): string {
  const currencyName = currencyNameByCode.get(spelling);
  if (currencyName != null) {
    return `${currencyName} (${spelling})`;
  }

  const entry = measureEntryBySpelling.get(spelling);
  if (entry != null) {
    return `${entry.names[0]} (${spelling})`;
  }

  return spelling;
}
