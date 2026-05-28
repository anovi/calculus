import type Decimal from 'decimal.js'

import type { CalcValue } from '../calculator'

export function formatResult(n: Decimal | undefined): string {
    if (n == null) return 'NaN';
    if (!n.isFinite()) return n.toString();
        if (n.isInteger()) return n.toString();
            return n.toDecimalPlaces(6).toString();
}

/** Display suffix after source text, e.g. `= 26` or `= 1.5 usd`. */
export function formatCalcSuffix(value: CalcValue): string | null {
    if (value.error != null) return '= Error';
    return `= ${formatResult(value.result)}${value.unit ? ` ${value.unit}` : ''}`;
}

/** Part after ` = ` when copying, e.g. `26` or `Error`. */
export function calcSuffixResultPart(suffix: string): string {
    return suffix.startsWith('= ') ? suffix.slice(2) : suffix;
}
