import { ratesStore } from "../rates-store";
import { CURRENCIES, type Currency } from "./currencies";


export function isCurrency(unit: string): unit is Currency {
    return Boolean(CURRENCIES.find(cur => cur === unit.toUpperCase()));
}

export function canConvert(unitA: string, unitB: string): boolean {
    return isCurrency(unitA) && isCurrency(unitB);
}

export function getConvertRate(unitA: string, unitB: string): number {
    if (isCurrency(unitA) && isCurrency(unitB)) {
        const entry = ratesStore.getEntry(unitA, unitB);
        if (entry) return entry.rate;
    }
    return 1;
}
