import Decimal from 'decimal.js';
import { TreeCursor } from '@lezer/common';
import { RangeValue, Range } from "@codemirror/state";

import { terms, type TermValue } from '../language';
import { normalizeUnit, areUnitsCompatible, canConvert, convertValue } from '../units';
import { isCurrency } from '../units/currency';
import { pairKey, type PairKey, type RatesStore } from '../rates-store';
import { BUILTIN_FUNCTION_BY_NAME } from '../functions';
import { builtinHandlers } from './builtin-handlers';
import type { ExpressionResult } from './types';

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

type Ctx = {
    cursor: TreeCursor,
    stack: TermValue[],
    bindings: Map<string, ExpressionResult>,
    currentNodeType: () => TermValue,
    parentNodeType: () => TermValue,
    sliceDoc: (from: number, to: number) => string,
    convert(value: ExpressionResult, toUnit: string): ExpressionResult,
    performOperation(operator: Operator, ...args: ExpressionResult[]): ExpressionResult,
}

// Props defaults to `any` so decision-tree handlers can declare narrow prop shapes.
type Handler<Props = any> = (ctx: Ctx, props: Props) => unknown;

type CalcDesecionPoint = null | TermValue | { slice: boolean } | {
    process: Handler,
    props?: {
        [key: string]: { expect: TermValue[] } | { expectMany: TermValue[] }
    }
};

function isResultWithUnit(expr: ExpressionResult): expr is ExpressionResult & {unit: string} {
    return Boolean(expr.unit && typeof expr.unit === 'string');
}

const IdentifierEvalContext: TermValue[] = [
    terms.ExpExpression,
    terms.AddExpression,
    terms.MulExpression,
    terms.ExpExpression,
    terms.ArgList
]

/**
 * Actions:
 * - pipeline: accumulate values and process
 * - process: get named params and call handler with params
 * - slice: take raw string
 * 
 * Need to track stack?
 * 
 * `null` is skip.
*/
const desecionTree: Record<TermValue, CalcDesecionPoint> = {
    [terms.CalcDoc]: null,
    [terms.Comment]: null,
    [terms.Cpr]: null,
    [terms.Opr]: null,
    [terms.Date]: null,
    [terms.String]: null,
    [terms.EqualSign]: null,
    
    // Operators
    [terms.ConvertOp]: null,
    [terms.TimesBinaryOp]: {slice: true},
    [terms.PlusBinaryOp]: {slice: true},
    [terms.PowBinaryOp]: {slice: true},

    // Numbers
    [terms.Number]: {
        process: (ctx): ExpressionResult | null => {
            const raw = ctx.sliceDoc(ctx.cursor.from, ctx.cursor.to).replaceAll(' ', '');
            try {
                return { n: new Decimal(raw) };
            } catch {
                return null;
            }
        }
    },
    [terms.NumberWithUnit]: {
        props: {
            number: { expect: [terms.Number] },
            unit: { expect: [terms.Unit] }
        },
        process: (
            _ctx,
            props: { number: ExpressionResult|null, unit: string|undefined }
        ): ExpressionResult|null => {
            if (props.number !== null && props.unit) {
                return { n: props.number.n, unit: props.unit } as ExpressionResult;
            }
            return null;
        }
    },

    // ID of a variable or a function
    [terms.Identifier]: {
        process: (ctx): undefined|string|ExpressionResult => {
            const parent: TermValue|undefined = ctx.parentNodeType();
            const id = ctx.sliceDoc(ctx.cursor.from, ctx.cursor.to);
            if (IdentifierEvalContext.includes(parent)) {
                return ctx.bindings.get(id);
            }
            return id;
        }
    },

    // Function
    [terms.FunctionCall]: {
        props: {
            id: { expect: [terms.Identifier] },
            args: { expect: [ terms.ArgList ] }
        },
        process: (_ctx, props: {id: string, args: ExpressionResult[]}): ExpressionResult|null => {
            const def = BUILTIN_FUNCTION_BY_NAME.get(props.id);
            if (!def) return null;
            if (props.args.length !== def.arity) return null;
            const handler = builtinHandlers.get(props.id);
            if (!handler) return null;
            return handler(props.args);
        }
    },
    [terms.ArgList]: {
        props: {
            args: {
                expectMany: [
                    terms.Literal,
                    terms.Identifier,
                    terms.MulExpression,
                    terms.ExpExpression,
                    terms.AddExpression,
                    terms.FunctionCall,
                ],
            }
        },
        process: (_ctx, props: { args: ExpressionResult[] }): ExpressionResult[] => props.args,
    },

    // Top level statements
    [terms.NoBinding]: terms.Binding,
    [terms.Binding]: {
        props: {
            id: {
                expect: [terms.Identifier],
            },
            result: {
                expect: [
                    terms.Literal,
                    terms.MulExpression,
                    terms.ExpExpression,
                    terms.AddExpression,
                    terms.FunctionCall,
                    terms.ConvertExpression
                ]
            }
        },
        process: (ctx, props: {id: string|undefined, result: null | ExpressionResult}): Range<CalcValue>|null => {
            let value: Range<CalcValue>|null = null;
            const {result, id} = props;
            if (result !== null) {
                value = new CalcValue(result.n, id, undefined, result.unit).range(ctx.cursor.from, ctx.cursor.to);
                if (id != null) ctx.bindings.set(id, result);
            }
            return value;
        },
    },
    
    // Expressions
    [terms.MulExpression]: terms.AddExpression,
    [terms.ExpExpression]: terms.AddExpression,
    [terms.AddExpression]: {
        props: {
            operator: {
                expect: [terms.PlusBinaryOp, terms.TimesBinaryOp, terms.PowBinaryOp]
            },
            operands: {
                expectMany: [
                    terms.Literal,
                    terms.AddExpression,
                    terms.MulExpression,
                    terms.ExpExpression,
                    terms.Identifier,
                    terms.FunctionCall,
                ]
            },
        },
        process: (
            ctx,
            params: { operator: Operator|null, operands: ExpressionResult[] }
        ): null|ExpressionResult => {
            const pipeline: ExpressionResult[] = params.operands;
            let operator: Operator = params.operator || '+';
            let convertToUnit: string|undefined = undefined;

            if (pipeline.length > 0) {
                const result = ctx.performOperation(operator, ...pipeline);
                if (convertToUnit) {
                    if (isResultWithUnit(result)) {
                        return ctx.convert(result, convertToUnit);
                    }
                    return { n: result.n, unit: convertToUnit };
                }
                return result;
            }
            return null;
        },
    },
    [terms.ConvertExpression]: {
        props: {
            toUnit: {
                expect: [terms.Unit]
            },
            value: {
                expect: [
                    terms.Literal,
                    terms.AddExpression,
                    terms.MulExpression,
                    terms.ExpExpression,
                    terms.Identifier,
                    terms.FunctionCall,
                ]
            },
        },
        process: (
            ctx,
            params: { value: ExpressionResult & {unit: string}, toUnit: string }
        ): ExpressionResult => {
            return ctx.convert(params.value, params.toUnit);
        }
    },

    // Literal
    [terms.Literal]: {
        props: {
            value: {
                expect: [terms.NumberWithUnit, terms.Number]
            }
        },
        process: (_ctx, params): ExpressionResult => params.value,
    },

    // Unit
    [terms.Unit]: {
        process: (ctx): string|undefined => {
            const raw = ctx.sliceDoc(ctx.cursor.from, ctx.cursor.to);
            const unit = normalizeUnit(raw) ?? undefined;
            return unit;
        }
    }
}


export class MathCalculator implements Ctx {

	constructor(sliceDoc: (from: number, to: number) => string, ratesStore: RatesStore) {
		this.sliceDoc = sliceDoc;
        this.rates = ratesStore;
        this.cursor = null as unknown as TreeCursor;
	}

    stack: TermValue[] = [];
    rates: RatesStore;
    ratesAwaited: PairKey[] = [];
    bindings: Map<string, ExpressionResult> = new Map();
    cursor: TreeCursor;

    currentNodeType(): TermValue { return this.stack[this.stack.length - 1] }
    parentNodeType(): TermValue { return this.stack[this.stack.length - 2] }
    
    sliceDoc: (from: number, to: number) => string;

    assemble(cursor: TreeCursor, throwErrors: boolean = false): Range<CalcValue>[]|null {
        this.cursor = cursor;
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

    convert(value: ExpressionResult, toUnit: string): ExpressionResult {
        let rate: number = 1;
        const unitA = value.unit;
        const unitB = toUnit;

        if (!unitA) return { n: value.n, unit: unitB };

        if (isCurrency(unitA) && isCurrency(unitB)) {
            const currencyRate = this.rates.getRate(unitA, unitB);
            if (currencyRate == null) {
                this.ratesAwaited.push(pairKey(unitA, unitB));
                rate = NaN; // Got a better idea?
            } else {
                rate = currencyRate;
            }
            return {
                n: value.n.times(rate),
                unit: unitB,
            }
        }
        
        if (canConvert(unitA, unitB)) {
            const newVal = convertValue(value.n, unitA, unitB);
            return { n: newVal, unit: unitB };
        }

        return value;
    }

    performOperation(operator: Operator, ...args: ExpressionResult[]): ExpressionResult {
        if (operator === '-' && args.length === 1) {
            return { n: args[0].n.negated(), unit: args[0].unit };
        }

        let baseUnit: string | undefined;
        for (let i = args.length - 1; i >= 0; i--) {
            if (args[i].unit) {
                baseUnit = args[i].unit;
                break;
            }
        }

        const normalized: ExpressionResult[] = [];
        for (const arg of args) {
            if (baseUnit && arg.unit && arg.unit !== baseUnit) {
                if (!areUnitsCompatible(baseUnit, arg.unit)) {
                    return { n: new Decimal(NaN), unit: baseUnit };
                }
                normalized.push(this.convert({ ...arg, unit: arg.unit }, baseUnit));
            } else {
                normalized.push(arg);
            }
        }

        let result = normalized[0].n;
        for (let index = 1; index < normalized.length; index++) {
            const exp = normalized[index];
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


	private processRows(cursor: TreeCursor): Range<CalcValue>[] {
		const pipeline: Range<CalcValue>[] = [];
		if (cursor.firstChild()) {
			do {
                const node: CalcDesecionPoint = desecionTree[cursor.type.id as TermValue];
                const value = this.handle(cursor, node) as Range<CalcValue>;
                if (value) pipeline.push(value);
			} while (cursor.nextSibling());
			cursor.parent();
		}
		return pipeline;
	}

    private handle(cursor: TreeCursor, node: CalcDesecionPoint): unknown | null {
        if (node === null) return null;

        if (typeof node === 'number') {
            const val = this.handle(cursor, desecionTree[node as TermValue]);
            return val;
        }

        if (typeof node !== 'object') {
            return null;
        }

        if ('slice' in node) {
            this.stack.push(cursor.type.id as TermValue);
            const val = this.sliceDoc(cursor.from, cursor.to);
            this.stack.pop();
            return val;
        }
        
        if ('props' in node) {
            const props: Record<string, unknown> = {};
            this.stack.push(cursor.type.id as TermValue);

            for (const key in node.props) {
                if (Object.prototype.hasOwnProperty.call(node.props, key)) {
                    const propDev = node.props[key];

                    if ('expect' in propDev) {
                        props[key] = this.getFirstChildTypeValue(cursor, propDev.expect);
                    } else if ('expectMany' in propDev) {
                        props[key] =  this.collectChildValues(cursor, propDev.expectMany);
                    }
                }
            }

            const val = node.process(this, props);
            this.stack.pop();
            return val;
        }

        if ('process' in node) {
            this.stack.push(cursor.type.id as TermValue);
            const val = node.process(this, {});
            this.stack.pop();
            return val;
        }

        return null;
    }

    private collectChildValues(cursor: TreeCursor, types: TermValue[]): unknown[] {
        if (!cursor.firstChild()) return [];
        const values: unknown[] = [];
        do {
            const type = cursor.type.id as TermValue;
            if (types.includes(type)) {
                const node: CalcDesecionPoint = desecionTree[cursor.type.id as TermValue];
                values.push(this.handle(cursor, node));
            }
        } while (cursor.nextSibling());
        cursor.parent();
        return values;
    }

    private getFirstChildTypeValue(cursor: TreeCursor, types: TermValue[]): unknown {
        if (!cursor.firstChild()) return null;
        let value: unknown = null;
        do {
            const type = cursor.type.id as TermValue;
            if (types.includes(type)) {
                const node: CalcDesecionPoint = desecionTree[type];
                value = this.handle(cursor, node);
                break;
            }
        } while (cursor.nextSibling());
        cursor.parent();
        return value;
    }

    
}