import Decimal from 'decimal.js';

/** One circulating currency row (see `currencies-list.csv`). */
export interface CurrencyEntry {
	readonly code: string;
	readonly name: string;
	readonly symbol?: string;
	readonly fractionalUnit?: string;
	/** Minor units per major unit (e.g. 100 cents per dollar). */
	readonly numberToBasic?: number;
}

export interface UnitsConverter {
    canConvert(unitA: string, unitB: string): boolean;
    convertValue(value: Decimal, unitA: string, unitB: string): Decimal;
}

export interface UnitsRetreiver {
    searchByPrefix: (term: string) => MeasureEntry[];
    getLongestMatch: (peek: (offset: number) => number) => number;
    getCompatibleConvertUnits: (key: string) => MeasureEntry[];
}

export const UnitType = {
    measure: 0,
    currency: 1,
} as const;

export type MeasureEntry = {
    type: typeof UnitType[keyof typeof UnitType];
	names: readonly string[];
	symbols?: readonly string[];
};