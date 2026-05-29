import type Decimal from 'decimal.js';


type DecimalNaN = {
    // d: null,
    // e: typeof NaN,
    // s: typeof NaN,
    // isFinite: () => false,
}

export type ExpressionResultOk = { n: Decimal; unit?: string; error?: undefined };

export type ExpressionResultError = {
    n: Decimal & DecimalNaN;
    unit?: string;
    error: string;
    from: number;
    to: number;
    /** Canonical spellings the user can pick when {@link normalizeUnit} is ambiguous. */
    unitChoices?: readonly string[];
};

export type ExpressionResult = ExpressionResultOk | ExpressionResultError;

export function isExpressionResultError (res: unknown): res is ExpressionResultError  {
    return Boolean(typeof res === 'object' && res !== null && 'error' in res && res.error);
}