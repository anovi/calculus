import { CURRENCIES } from "../language/currencies";
import type { CurrencyCode } from "./types";


export function isCurrency(unit: string): unit is CurrencyCode {
    return Boolean(CURRENCIES.find(cur => cur === unit.toUpperCase()));
}