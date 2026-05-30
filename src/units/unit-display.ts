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

function unitFullName(spelling: string): string | undefined {
  const currencyName = currencyNameByCode.get(spelling.toUpperCase());
  if (currencyName != null) return currencyName;

  const entry = measureEntryBySpelling.get(spelling);
  if (entry != null) return entry.names[0];

  return undefined;
}

/** Primary human-readable unit name, e.g. `Euro` or `kilometers`. */
export function formatUnitFullName(spelling: string): string {
  return unitFullName(spelling) ?? spelling;
}

/** Human-readable label for a canonical unit spelling, e.g. `milliseconds (ms)`. */
export function formatUnitChoiceLabel(spelling: string): string {
  const name = unitFullName(spelling);
  if (name != null) return `${name} (${spelling})`;
  return spelling;
}
