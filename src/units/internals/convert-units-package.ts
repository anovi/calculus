import configureMeasurements from 'convert-units';
import allMeasures from 'convert-units/definitions/all';
import Decimal from 'decimal.js';
import type { UnitsConverter } from '../types';

export const convertUnits = configureMeasurements(allMeasures);

export const convertLibUnitsConverter: UnitsConverter = {
    canConvert(unitA: string, unitB: string): boolean {
        const a = convertUnits().getUnit(unitA);
        const b = convertUnits().getUnit(unitB);
        return a != null && b != null && a.measure === b.measure;
    },

    convertValue(value: Decimal, unitA: string, unitB: string): Decimal {
        const res = convertUnits(value.toNumber()).from(unitA).to(unitB);
        return new Decimal(res);
    },
};
