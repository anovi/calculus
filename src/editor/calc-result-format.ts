import Decimal from 'decimal.js'

import { CalcValue } from '../calculator'
import { getCurrencyDecimalPlaces, isCurrency } from '../units/currency'

function formatNumber(n: Decimal, decimalPlaces?: number): string {
    if (!n.isFinite()) return n.toString();
    if (decimalPlaces != null) {
        const rounded = n.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP);
        if (rounded.isInteger()) return rounded.toString();
        return rounded.toString();
    }
    if (n.isInteger()) return n.toString();
    return n.toDecimalPlaces(6).toString();
}

function decimalPlacesForValue(value: CalcValue): number | undefined {
    const unit = value.unit;
    if (!unit || !isCurrency(unit)) return undefined;
    return getCurrencyDecimalPlaces(unit);
}

/** Formatted numeric result and unit suffix, e.g. `26.5` or `1.234 usd`. */
export function formatResult(value: CalcValue): string {
    const n = value.result;
    if (n == null || n.isNaN()) return 'NaN';

    const formatted = formatNumber(n, decimalPlacesForValue(value));
    return value.unit ? `${formatted} ${value.unit}` : formatted;
}

/** Display suffix after source text, e.g. `= 26` or `= 1.5 usd`. */
export function formatCalcSuffix(value: CalcValue): string | null {
    if (value.error != null) return '= Error';
    return `= ${formatResult(value)}`;
}

/** Part after ` = ` when copying, e.g. `26` or `Error`. */
export function calcSuffixResultPart(suffix: string): string {
    return suffix.startsWith('= ') ? suffix.slice(2) : suffix;
}
