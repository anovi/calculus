import Decimal from 'decimal.js';
import { TreeCursor } from '@lezer/common';
import { RangeValue, Range } from "@codemirror/state";

import { terms } from '../language';
import { parseNumberWithCurrency } from '../language/currencies';
import { canConvert, getConvertRate, isCurrency } from '../units/unit-converter';
import { pairKey, type RatesStore } from '../rates-store';
import type { Currency } from '../units/currencies';

type ExpressionResult = { n: Decimal; unit?: string };


/** Represents a row of calculation; can be binded to a name or not */
export class CalcValue extends RangeValue {
    readonly result: Decimal;
    readonly dependencies?: string[];
    readonly name?: string;
    readonly unit?: string;
    constructor(result: Decimal, name?: string, dependencies?: string[], unit?: string) {
        super();
        this.result = result;
        this.name = name;
        this.dependencies = dependencies;
        this.unit = unit;
    }
}

type Operator = '-' | '+' | '/' | '*' | '%' | '^';

export class MathComposer {

    rates: RatesStore;
    ratesAwaited: Currency[] = [];

	constructor(sliceDoc: (from: number, to: number) => string, ratesStore: RatesStore) {
		this.sliceDoc = sliceDoc;
        this.rates = ratesStore;
	}
    
    bindings: Map<string, ExpressionResult> = new Map();

    sliceDoc: (from: number, to: number) => string;

    assemble(cursor: TreeCursor, throwErrors: boolean = false): Range<CalcValue>[]|null {
		try {
            if (cursor.type.id === terms.CalcDoc) {
                return this.processRows(cursor);
            }
            throw Error(`Cursor is not on CalcDoc root node!`);	
		} catch (error) {
			if (throwErrors) {
				console.error(error);
				throw error;
			}
			else if (error instanceof Error) {
				console.error(error);
			}
		}
		return null;
	}

    private readonly nodeHandlers: Map<number, (cursor: TreeCursor) => unknown> = new Map<number, (cursor: TreeCursor) => unknown>([
        [terms.Binding, (cursor) => this.processBinding(cursor)],
        [terms.NoBinding, (cursor) => this.processBinding(cursor)],
        [terms.ConvertExpression, (cursor) => this.processConvertExpression(cursor)],
        [terms.AddExpression, (cursor) => this.processAddExpression(cursor)],
        [terms.MulExpression, (cursor) => this.processMulExpression(cursor)],
        [terms.ConvertExpression, (cursor) => this.processConvertExpression(cursor)],
        [terms.String, (cursor) => this.processString(cursor)],
        [terms.Number, (cursor) => this.processNumber(cursor)],
        [terms.FunctionCall, (cursor) => this.processFunctionCall(cursor)],
    ]);

	private processRows(cursor: TreeCursor): Range<CalcValue>[] {
		const pipeline: Range<CalcValue>[] = [];
		if (cursor.firstChild()) {
			do {
                const value = this.callHandler<Range<CalcValue> | null>(cursor.type.id, cursor);
                if (value) pipeline.push(value);
			} while (cursor.nextSibling());
			cursor.parent();
		}
		return pipeline;
	}

    private callHandler<T>(termId: number, cursor: TreeCursor): T | null {
        const handler = this.nodeHandlers.get(termId);
        if (!handler) return null;
        return handler(cursor) as T;
    }

    private forEachChild(
        cursor: TreeCursor,
        handlers: ReadonlyMap<number, (cursor: TreeCursor) => void>
    ): void {
        if (!cursor.firstChild()) return;
        do {
            handlers.get(cursor.type.id)?.(cursor);
        } while (cursor.nextSibling());
        cursor.parent();
    }

    private processBinding(cursor: TreeCursor): Range<CalcValue>|null {
        let value: Range<CalcValue>|null = null;
        let id: string|undefined = undefined;
        let result: null | ExpressionResult = null as null | ExpressionResult;

        this.forEachChild(cursor, new Map<number, (childCursor: TreeCursor) => void>([
            [terms.Identifier, (childCursor) => {
                id = this.sliceDoc(childCursor.from, childCursor.to);
            }],
            [terms.Literal, (childCursor) => {
                result = this.processLiteral(childCursor);
            }],
            [terms.MulExpression, (childCursor) => {
                result = this.callHandler<ExpressionResult>(terms.MulExpression, childCursor);
            }],
            [terms.AddExpression, (childCursor) => {
                result = this.callHandler<ExpressionResult>(terms.AddExpression, childCursor);
            }],
            [terms.FunctionCall, (childCursor) => {
                result = this.callHandler<ExpressionResult>(terms.FunctionCall, childCursor);
            }],
            [terms.ConvertExpression, (childCursor) => {
                result = this.callHandler<ExpressionResult>(terms.ConvertExpression, childCursor);
            }],
        ]));

        if (result !== null) {
            value = new CalcValue(result.n, id, undefined, result.unit).range(cursor.from, cursor.to);
            if (id !== undefined) this.bindings.set(id, result);
        }
        return value;
    }
    // reducer: (...values: number[]) => number
    private processExpression(cursor: TreeCursor, type: 'plus'|'times'|'convert'): ExpressionResult | null {
        const pipeline: ExpressionResult[] = [];
        let operator: Operator = '+';
        let convertToUnit: string|undefined = undefined;

        this.forEachChild(cursor, new Map<number, (childCursor: TreeCursor) => void>([
            [terms.AddExpression, (nestedCursor) => {
                const value = this.callHandler<ExpressionResult>(terms.AddExpression, nestedCursor);
                if (value !== null) pipeline.push(value);
            }],
            [terms.MulExpression, (nestedCursor) => {
                const value = this.callHandler<ExpressionResult>(terms.MulExpression, nestedCursor);
                if (value !== null) pipeline.push(value);
            }],
            [terms.ConvertExpression, (nestedCursor) => {
                const res = this.processConvertExpression(nestedCursor)
                if (res) pipeline.push(res);
            }],
            [terms.Unit, (nestedCursor) => {
                if (type === 'convert') {
                    convertToUnit = this.sliceDoc(nestedCursor.from, nestedCursor.to);
                }
            }],
            [terms.Identifier, (nestedCursor) => {
                const id = this.sliceDoc(nestedCursor.from, nestedCursor.to);
                const value = this.bindings.get(id)
                if (value) pipeline.push(value);
            }],
            [terms.Literal, (nestedCursor) => {
                const lit = this.processLiteral(nestedCursor);
                if (lit) pipeline.push(lit);
            }],
            [terms.FunctionCall, (nestedCursor) => {
                const value = this.callHandler<ExpressionResult>(terms.FunctionCall, nestedCursor);
                if (value) pipeline.push(value);
            }],
            [terms.PlusBinaryOp, (cursor) => {
                operator = this.sliceDoc(cursor.from, cursor.to) as Operator;
            }],
            [terms.TimesBinaryOp, () => {
                operator = this.sliceDoc(cursor.from, cursor.to) as Operator;
            }],
        ]));

        if (pipeline.length > 0) {
            const result = this.performOperation(operator, ...pipeline);
            if (convertToUnit && result.unit && typeof result.unit === 'string') {
                return this.convert(result as ExpressionResult & {unit: string}, convertToUnit);
            }
            return result;
        }
        return null;
    }

    private convert(value: ExpressionResult & {unit: string}, unit: string): ExpressionResult {
        if (canConvert(value.unit, unit)) {
            let rate: number = 1;
            if (isCurrency(unit) && isCurrency(value.unit)) {
                const currencyRate = this.rates.getRate(value.unit, unit);
                if (currencyRate == null) {
                    this.ratesAwaited.push(pairKey(value.unit, unit))
                    rate = NaN; // Got a better idea?
                } else {
                    rate = currencyRate;
                }
            } else {
                rate = getConvertRate(value.unit, unit);
            } 
            return {
                n: value.n.times(rate),
                unit: unit,
            }
        }
        return value;
    }

    private processAddExpression(cursor: TreeCursor): ExpressionResult|null {
        return this.processExpression(cursor, 'plus');
    }

    private processMulExpression(cursor: TreeCursor): ExpressionResult|null {
        return this.processExpression(cursor, 'times');
    }

    private processConvertExpression(cursor: TreeCursor): ExpressionResult | null {
        return this.processExpression(cursor, 'convert');
    }

    private processLiteral(cursor: TreeCursor): ExpressionResult | null {
        let result: ExpressionResult | null = null;

        this.forEachChild(cursor, new Map<number, (childCursor: TreeCursor) => void>([
            [terms.Number, (numberCursor) => {
                const v = this.callHandler<ExpressionResult>(terms.Number, numberCursor);
                if (v !== null) result = v;
            }],
            [terms.NumberWithUnit, (nwuCursor) => {
                const raw = this.sliceDoc(nwuCursor.from, nwuCursor.to);
                const parsed = parseNumberWithCurrency(raw);
                if (parsed) {
                    result = { n: new Decimal(parsed.value), unit: parsed.unit };
                }
            }],
        ]));

        if (result === null) return null;
        return result;
    }

    private processString(_cursor: TreeCursor): null {
        return null;
    }

    private processNumber(cursor: TreeCursor): ExpressionResult | null {
        const raw = this.sliceDoc(cursor.from, cursor.to);
        try {
            return { n: new Decimal(raw) };
        } catch {
            return null;
        }
    }

    private evalExpressionValue(cursor: TreeCursor): ExpressionResult | null {
        switch (cursor.type.id) {
            case terms.Literal:
                return this.processLiteral(cursor) ?? null;
            case terms.AddExpression:
                return this.processAddExpression(cursor);
            case terms.MulExpression:
                return this.processMulExpression(cursor);
            case terms.Identifier: {
                const id = this.sliceDoc(cursor.from, cursor.to);
                const value = this.bindings.get(id);
                return value ? value : null;
            }
            case terms.FunctionCall:
                return this.processFunctionCall(cursor);
            default:
                return null;
        }
    }

    private processArgList(cursor: TreeCursor): ExpressionResult[] {
        const args: ExpressionResult[] = [];
        if (!cursor.firstChild()) return args;
        do {
            const value = this.evalExpressionValue(cursor);
            if (value !== null) args.push(value);
        } while (cursor.nextSibling());
        cursor.parent();
        return args;
    }

    private processFunctionCall(cursor: TreeCursor): ExpressionResult | null {
        let name = '';
        let args: ExpressionResult[] = [];
        this.forEachChild(cursor, new Map<number, (childCursor: TreeCursor) => void>([
            [terms.Identifier, (childCursor) => {
                name = this.sliceDoc(childCursor.from, childCursor.to).toLowerCase();
            }],
            [terms.ArgList, (childCursor) => {
                args = this.processArgList(childCursor);
            }],
        ]));
        if (name === 'sqrt') {
            if (args.length !== 1) return null;
            return { n: args[0].n.sqrt(), unit: args[0].unit };
        }
        return null;
    }

    private performOperation(operator: Operator, ...args: ExpressionResult[]): ExpressionResult {
        let result = args[0].n;
        const baseUnit: string|undefined = args[0].unit;
        for (let index = 1; index < args.length; index++) {
            let exp = args[index];
            if (baseUnit) {
                if (exp.unit && canConvert(exp.unit, baseUnit)) {
                    exp = this.convert({ ...exp, unit: exp.unit }, baseUnit);
                }
            }
            switch (operator) {
                case '-':
                    result = result.minus(exp.n);
                    break;
                case '+':
                    result = result.plus(exp.n);
                    break;
                case '%':
                    result = result.mod(exp.n);
                    break;
                case '*':
                    result = result.times(exp.n);
                    break;
                case '/':
                    result = result.div(exp.n);
                    break;
                case '^':
                    result = result.pow(exp.n);
                    break;
                default:
                    throw Error(`Unknown operator ${operator}`)
            }
        }
        return { n: result, unit: baseUnit };
    }
}
