import { CURRENCY_CODES } from './currencies-list';
import { isCurrency } from './currency';
import { getMeasureKind } from './internals/convert-package';
import { CANONICAL_UNIT_SPELLINGS, normalizeUnit } from './unit-name-normalizer';

/** Convert targets: no single-letter spellings; `in` is the convert keyword. */
function isStandaloneConvertSpelling(unit: string): boolean {
  return unit.length > 1 && unit.toLowerCase() !== 'in';
}

const currencyTargets = Object.freeze(
  CURRENCY_CODES.filter(isStandaloneConvertSpelling),
);

const convertTargetsByMeasureKind = new Map<number, string[]>();

for (const unit of CANONICAL_UNIT_SPELLINGS) {
  if (!isStandaloneConvertSpelling(unit)) continue;
  const kind = getMeasureKind(unit);
  if (kind == null) continue;
  const list = convertTargetsByMeasureKind.get(kind) ?? [];
  if (!list.includes(unit)) list.push(unit);
  convertTargetsByMeasureKind.set(kind, list);
}

for (const list of convertTargetsByMeasureKind.values()) {
  list.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));
}

/**
 * Unit spellings valid as the target of `in` / `to` for a value with `sourceUnit`.
 * Currency converts to currency only; physical units stay within one measure kind.
 */
export function getCompatibleConvertUnits(sourceUnit: string): readonly string[] {
  const canonical = normalizeUnit(sourceUnit);
  if (!canonical || Array.isArray(canonical)) return [];

  if (isCurrency(canonical)) return currencyTargets;

  const kind = getMeasureKind(canonical);
  if (kind == null) return [];

  return convertTargetsByMeasureKind.get(kind) ?? [];
}
