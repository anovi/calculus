import Decimal from 'decimal.js';
import { convertPackageUnitsConverter, units as _units } from './internals/convert-package';
import type { MeasureEntry } from './types';



export function canConvert(unitA: string, unitB: string): boolean {
    return convertPackageUnitsConverter.canConvert(unitA, unitB);
}

export function convertValue(value: Decimal, unitA: string, unitB: string): Decimal {
    return convertPackageUnitsConverter.convertValue(value, unitA, unitB);
}

export const units: MeasureEntry[] = _units;