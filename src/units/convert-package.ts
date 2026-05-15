import Decimal from 'decimal.js';
import convert, { getMeasureKind, type Unit } from '../../node_modules/convert/dist/index.js';
import type { UnitsConverter } from './unit-converter';

export { convert, getMeasureKind };
export type { Unit };
export {
  getConvertUnitSpellings,
  normalizeConvertUnit,
} from './convert-unit-catalog';

export const convertPackageUnitsConverter: UnitsConverter = {
    canConvert(unitA: string, unitB: string): boolean {
        const kindA = getMeasureKind(unitA);
        const kindB = getMeasureKind(unitB);
        return kindA != null && kindA === kindB;
    },

    convertValue(value: Decimal, unitA: string, unitB: string): Decimal {
        const res = convert(value.toNumber(), unitA as Unit).to(unitB as Unit);
        return new Decimal(res);
    },
};
