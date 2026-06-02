import Decimal from 'decimal.js'

import { CalcValue } from '../calculator'
import {
    formatUnitFullName,
    getMeasureDisplayDecimalPlaces,
    getCurrencyDecimalPlaces,
    isCurrency,
    normalizeUnit,
} from '../units'

/** Fractional digits for result tooltips — full underlying value, not display rounding. */
const TOOLTIP_DECIMAL_PLACES = 15

function addThousandsSeparators(raw: string): string {
    const dot = raw.indexOf('.')
    const intPart = dot === -1 ? raw : raw.slice(0, dot)
    const fracPart = dot === -1 ? undefined : raw.slice(dot + 1)

    const sign = intPart.startsWith('-') ? '-' : ''
    const digits = sign ? intPart.slice(1) : intPart
    const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

    if (fracPart === undefined) return `${sign}${grouped}`
    return `${sign}${grouped}.${fracPart}`
}

function formatNumber(n: Decimal, decimalPlaces?: number): string {
    if (!n.isFinite()) return n.toString();
    let raw: string
    if (decimalPlaces != null) {
        raw = n.toDecimalPlaces(decimalPlaces, Decimal.ROUND_HALF_UP).toString()
    } else if (n.isInteger()) {
        raw = n.toString()
    } else {
        raw = n.toDecimalPlaces(6).toString()
    }
    return addThousandsSeparators(raw)
}

function decimalPlacesForValue(value: CalcValue): number | undefined {
    const unit = value.unit;
    if (!unit) return undefined;
    if (isCurrency(unit)) return getCurrencyDecimalPlaces(unit);
    return getMeasureDisplayDecimalPlaces(value.result, unit);
}

function formatHighPrecision(n: Decimal): string {
    if (!n.isFinite()) return n.toString()
    if (n.isInteger()) return n.toString()
    return n.toDecimalPlaces(TOOLTIP_DECIMAL_PLACES, Decimal.ROUND_HALF_UP).toString()
}

function unitSpellingForDisplay(unit: string): string {
    const normalized = normalizeUnit(unit)
    if (normalized == null) return unit
    if (Array.isArray(normalized)) return unit
    return normalized
}

export type ResultTooltipContent = {
    name?: string
    value: string
    unit?: string
}

/** Tooltip body for a result pill: high-precision value and optional full unit name. */
export function getResultTooltipContent(value: CalcValue): ResultTooltipContent | null {
    if (value.error != null) return null
    const n = value.result
    if (n == null || n.isNaN()) return { value: 'NaN' }
    const content: ResultTooltipContent = {
        name: value.name,
        value: formatHighPrecision(n),
    }
    if (value.unit) {
        content.unit = formatUnitFullName(unitSpellingForDisplay(value.unit))
    }
    return content
}

/** Formatted numeric result and unit suffix, e.g. `26.5` or `1.234 usd`. */
export function formatResult(value: CalcValue): string {
    const n = value.result;
    if (n == null || n.isNaN()) return 'NaN';

    const formatted = formatNumber(n, decimalPlacesForValue(value));
    // const formatted = n.toDecimalPlaces(6).toString();
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
