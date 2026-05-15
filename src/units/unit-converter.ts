import Decimal from 'decimal.js';
import { convertPackageUnitsConverter } from './convert-package';

export interface UnitsConverter {
    canConvert(unitA: string, unitB: string): boolean;
    convertValue(value: Decimal, unitA: string, unitB: string): Decimal;
}

/** Baseline unit conversion backed by the `convert` package. */
export const unitsConverter: UnitsConverter = convertPackageUnitsConverter;

export function canConvert(unitA: string, unitB: string): boolean {
    return unitsConverter.canConvert(unitA, unitB);
}

export function convertValue(value: Decimal, unitA: string, unitB: string): Decimal {
    return unitsConverter.convertValue(value, unitA, unitB);
}
