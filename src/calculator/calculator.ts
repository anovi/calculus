import Decimal from 'decimal.js';
import { TreeCursor } from '@lezer/common';
import { RangeValue, Range } from "@codemirror/state";

import { terms, type TermValue } from '../language';
import { normalizeUnit, areUnitsCompatible, canConvert, convertValue } from '../units';
import { isCurrency } from '../units/currency';
import { pairKey, type PairKey, type RatesStore } from '../rates-store';
import { BUILTIN_FUNCTION_BY_NAME } from '../functions';
import { builtinHandlers } from './builtin-handlers';
import { isExpressionResultError, type ExpressionResult, type ExpressionResultError } from './types';

/** Represents line's calculation result; can be binded to a name */
export class CalcValue extends RangeValue {
    readonly result: Decimal;
    readonly dependencies?: string[];
    readonly name?: string;
    readonly unit?: string;
    readonly error?: string;
    readonly errorFrom?: number;
    readonly errorTo?: number;
    constructor(result: Decimal, name?: string, dependencies?: string[], unit?: string, error?: string, errorFrom?: number, errorTo?: number) {
        super();
        this.result = result;
        this.name = name;
        this.dependencies = dependencies;
        this.unit = unit;
        this.error = error;
        this.errorFrom = errorFrom;
        this.errorTo = errorTo;
    }
}

function expressionError(message: string, cursor: TreeCursor, unit?: string): ExpressionResultError {
    return { n: new Decimal(NaN), unit, error: message, from: cursor.from, to: cursor.to };
}

function findFirstOperandError(...operands: ExpressionResult[]): ExpressionResult | undefined {
    return operands.find((op) => op && op.error != null);
}

function calcValueFromExpr(expr: ExpressionResult, name?: string): CalcValue {
    const isError = isExpressionResultError(expr);
    const n = expr.n ?? new Decimal(NaN);
    return new CalcValue(n, name, undefined, expr.unit, expr.error, isError ? expr.from : undefined, isError ? expr.to : undefined );
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
    performOperation(cursor: TreeCursor, operator: Operator, ...args: ExpressionResult[]): ExpressionResult,
}

// Props defaults to `any` so decision-tree processors declare narrow prop shapes.
type Processor<Props = any> = (ctx: Ctx, props: Props) => unknown;

const SKIP = Symbol('skip');
const SLICE = Symbol('slice');
type QuickDecision = typeof SKIP | typeof SLICE;

type CalcDecisionPointWithExpectations = {
    process: Processor,
    breakAtError?: true,
    props: (
        | { key: string, expect: TermValue[], optional?: boolean }
        | { key: string, expectMany: TermValue[] }
    )[]
}

type CalcDecisionPoint =
    Omit<CalcDecisionPointWithExpectations, 'props'> & Partial<Pick<CalcDecisionPointWithExpectations, 'props'>>
    | QuickDecision
    | TermValue;


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
 * This config defines how to process node values.
 * 
 * If node's processor is `null` the node will be skipped.
 * 
 * When `{slice: true}` it will be taken as string as is.
 * 
 * If `props` is present, they will be calculated and passed to `process`, see {@link CalcDecisionPoint} type.
*/
const decisionTree: Record<TermValue, CalcDecisionPoint> = {
    [terms.CalcDoc]: SKIP,
    [terms.Comment]: SKIP,
    [terms.Cpr]: SKIP,
    [terms.Opr]: SKIP,
    [terms.Date]: SKIP,
    [terms.String]: SKIP,
    [terms.EqualSign]: SKIP,
    
    // Operators
    [terms.ConvertOp]: SKIP,
    [terms.TimesBinaryOp]: SLICE,
    [terms.PlusBinaryOp]: SLICE,
    [terms.PowBinaryOp]: SLICE,

    // Numbers
    [terms.Number]: {
        process: (ctx): ExpressionResult | null => {
            const raw = ctx.sliceDoc(ctx.cursor.from, ctx.cursor.to).replaceAll(' ', '');
            try {
                return { n: new Decimal(raw) };
            } catch {
                return expressionError(`Invalid number "${raw}".`, ctx.cursor);
            }
        }
    },
    [terms.NumberWithUnit]: {
        props: [
            { key: 'number', expect: [terms.Number] },
            { key: 'unit', expect: [terms.Unit] }
        ],
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
            const name = ctx.sliceDoc(ctx.cursor.from, ctx.cursor.to);
            if (IdentifierEvalContext.includes(ctx.parentNodeType())) {
                const val = ctx.bindings.get(name);
                if (!val) {
                    return expressionError(`Variable "${name}" is not defined.`, ctx.cursor);
                }
                return val;
            }
            return name;
        }
    },

    // Function
    [terms.FunctionCall]: {
        props: [
            { key: 'id', expect: [terms.Identifier] },
            { key: 'args', expect: [ terms.ArgList ] }
        ],
        process: (ctx, props: { id: string, args: ExpressionResult[] }): ExpressionResult|null => {
            const argError = findFirstOperandError(...props.args);
            if (argError) return argError;
            const def = BUILTIN_FUNCTION_BY_NAME.get(props.id);
            if (!def) return expressionError(`Unknown function "${props.id}".`, ctx.cursor);
            if (props.args.length !== def.arity) {
                const n = def.arity;
                const label = n === 1 ? '1 argument' : `${n} arguments`;
                return expressionError(
                    `${props.id}() expects ${label}, got ${props.args.length}.`,
                    ctx.cursor,
                );
            }
            const builtinHandler = builtinHandlers.get(props.id);
            if (!builtinHandler) return null;
            return builtinHandler(props.args);
        }
    },
    [terms.ArgList]: {
        props: [{
            key: 'args',
            expectMany: [
                terms.Literal,
                terms.Identifier,
                terms.MulExpression,
                terms.ExpExpression,
                terms.AddExpression,
                terms.FunctionCall,
            ],
        }],
        process: (_ctx, props: { args: ExpressionResult[] }): ExpressionResult[] => props.args,
    },

    // Top level statements
    [terms.NoBinding]: {
        breakAtError: true,
        props: [{
            key: 'result',
            expect: [
                terms.Literal,
                terms.MulExpression,
                terms.ExpExpression,
                terms.AddExpression,
                terms.FunctionCall,
                terms.ConvertExpression,
            ]
        }],
        process: (ctx, props: {result: null | ExpressionResult}): Range<CalcValue>|null => {
            const result = props.result
            if (result == null) return null;
            const value = calcValueFromExpr(result)
                .range(ctx.cursor.from, ctx.cursor.to);
            return value;
        },
    },
    [terms.Binding]: {
        breakAtError: true,
        props: [{
            key: 'id',
            expect: [terms.Identifier],
        },
        {
            key: 'result',
            expect: [
                terms.Literal,
                terms.MulExpression,
                terms.ExpExpression,
                terms.AddExpression,
                terms.FunctionCall,
                terms.ConvertExpression
            ]
        }],
        process: (ctx, props: {id: string|undefined, result: ExpressionResult}): Range<CalcValue>|null => {
            const { result, id } = props;
            const value = calcValueFromExpr(result, id).range(ctx.cursor.from, ctx.cursor.to);
            if (id != null && result.error == null) ctx.bindings.set(id, result);
            return value;
        },
    },
    
    // Expressions
    [terms.MulExpression]: terms.AddExpression,
    [terms.ExpExpression]: terms.AddExpression,
    [terms.AddExpression]: {
        props: [{
            key: 'operatorBefore',
            optional: true,
            expect: [terms.PlusBinaryOp, terms.TimesBinaryOp, terms.PowBinaryOp]
        },{
            key: 'operand1',
            expect: [
                terms.Literal,
                terms.AddExpression,
                terms.MulExpression,
                terms.ExpExpression,
                terms.Identifier,
                terms.FunctionCall,
            ]
        }, {
            key: 'operator',
            optional: true,
            expect: [terms.PlusBinaryOp, terms.TimesBinaryOp, terms.PowBinaryOp]
        },
        {
            key: 'operand2',
            optional: true,
            expect: [
                terms.Literal,
                terms.AddExpression,
                terms.MulExpression,
                terms.ExpExpression,
                terms.Identifier,
                terms.FunctionCall,
            ]
        }],
        process: (
            ctx,
            params: {
                operatorBefore?: Operator|void,
                operand1: ExpressionResult,
                operator?: Operator|null,
                operand2?: ExpressionResult
            }
        ): null|ExpressionResult => {
            let operator: Operator = params.operator || '+';
            let convertToUnit: string|undefined = undefined;

            if (params.operatorBefore) {
                params.operand1 = { ...params.operand1, n: params.operand1.n.negated() }
            }

            if (!params.operatorBefore && (!params.operator || !params.operand2)) return null;
            if ((params.operator && !params.operand2)) return null;

            const result = params.operand2
                ? ctx.performOperation(ctx.cursor, operator, params.operand1, params.operand2)
                : ctx.performOperation(ctx.cursor, operator, params.operand1);

            if (convertToUnit) {
                if (isResultWithUnit(result)) {
                    return ctx.convert(result, convertToUnit);
                }
                return { n: result.n, unit: convertToUnit };
            }
            return result;
        },
    },
    [terms.ConvertExpression]: {
        props: [{
            key: 'value',
            expect: [
                terms.Literal,
                terms.AddExpression,
                terms.MulExpression,
                terms.ExpExpression,
                terms.Identifier,
                terms.FunctionCall,
                terms.ConvertExpression,
            ]
        }, {
            key: 'toUnit',
            expect: [terms.Unit]
        }],
        process: (
            ctx,
            params: { value: ExpressionResult & {unit: string}, toUnit: string }
        ): ExpressionResult => {
            if (params.value.error) return params.value;
            return ctx.convert(params.value, params.toUnit);
        }
    },

    // Literal
    [terms.Literal]: {
        props: [{
            key: 'value',
            expect: [terms.NumberWithUnit, terms.Number]
        }],
        process: (_ctx, params): ExpressionResult => params.value,
    },

    // Unit
    [terms.Unit]: {
        process: (ctx): string | ExpressionResultError | undefined => {
            const raw = ctx.sliceDoc(ctx.cursor.from, ctx.cursor.to);
            const unit = normalizeUnit(raw);
            if (unit == null) {
                return expressionError(`Unknown unit "${raw}".`, ctx.cursor);
            }
            return unit;
        }
    }
}

/** Minimal line API shared by CodeMirror `Text` and plain-string construction. */
type LineDoc = { lines: number; line(n: number): { from: number; to: number } };

function lineIndexesFromString(text: string): number[] {
    const indexes: number[] = [];
    let from = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i] === '\n') {
            indexes.push(from, i);
            from = i + 1;
        }
    }
    indexes.push(from, text.length);
    return indexes;
}

function lineIndexesFromDoc(doc: LineDoc): number[] {
    const indexes: number[] = [];
    for (let n = 1; n <= doc.lines; n++) {
        const line = doc.line(n);
        indexes.push(line.from, line.to);
    }
    return indexes;
}

export function buildLineIndexes(doc: LineDoc | string): number[] {
    return typeof doc === 'string' ? lineIndexesFromString(doc) : lineIndexesFromDoc(doc);
}


export class MathCalculator implements Ctx {

	constructor(
        sliceDoc: (from: number, to?: number) => string,
        ratesStore: RatesStore,
        doc?: LineDoc | string,
    ) {
		this.sliceDoc = sliceDoc;
        this.rates = ratesStore;
        this.cursor = null as unknown as TreeCursor;
        this.lineIndexes = doc != null ? buildLineIndexes(doc) : [0, 0];
	}

    stack: TermValue[] = [];
    rates: RatesStore;
    ratesAwaited: PairKey[] = [];
    bindings: Map<string, ExpressionResult> = new Map();
    cursor: TreeCursor;
    
    currentNodeType(): TermValue { return this.stack[this.stack.length - 1] }
    parentNodeType(): TermValue { return this.stack[this.stack.length - 2] }
    
    sliceDoc: (from: number, to?: number) => string;
    
    private lineIndexes: number[];
    private currentLineIndex: number = 0;
    private currentLine: [number, number] = [-1, -1];

    assemble(cursor: TreeCursor): Range<CalcValue>[]|null {
        this.cursor = cursor;
        if (cursor.type.id !== terms.CalcDoc) {
            return null;
        }
        return this.processLines(cursor);
	}

    convert(value: ExpressionResult, toUnit: string): ExpressionResult {
        if (value.error) return value;
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

        return expressionError(`Cannot convert "${unitA}" to "${unitB}".`, this.cursor, unitA);
    }

    performOperation(cursor: TreeCursor, operator: Operator, ...args: ExpressionResult[]): ExpressionResult {
        const operandError = findFirstOperandError(...args);
        if (operandError) return operandError;

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

        const normalizeArg = (arg: ExpressionResult): ExpressionResult => {
            if (baseUnit && arg.unit && arg.unit !== baseUnit) {
                if (!areUnitsCompatible(baseUnit, arg.unit)) {
                    return expressionError(
                        `Cannot combine ${baseUnit} and ${arg.unit}.`,
                        cursor,
                        baseUnit,
                    );
                }
                return this.convert(arg, baseUnit);
            }
            return arg;
        };

        const first = normalizeArg(args[0]);
        if (isExpressionResultError(first)) return first;
        let result = first.n;
        for (let index = 1; index < args.length; index++) {
            const exp = normalizeArg(args[index]);
            if (isExpressionResultError(exp)) return exp;
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
                    return expressionError(`Unknown operator "${operator}"`, cursor);
            }
        }
        return { n: result, unit: baseUnit };
    }

    private setLine(cursor: TreeCursor) {
        for (let i = this.currentLineIndex; i < this.lineIndexes.length; i = i + 2) {
            const from = this.lineIndexes[i];
            const nextLineFrom = this.lineIndexes[i + 2] || this.lineIndexes[i + 1];
            if (cursor.from >= from &&
                cursor.to <= nextLineFrom
            ) {
                this.currentLine = [from, nextLineFrom];
                break;
            }
        }
    }

	private processLines(cursor: TreeCursor): Range<CalcValue>[] {
		const pipeline: Range<CalcValue>[] = [];
        let skipLineFrom: number = -1;
		if (this.moveToFirstChild(cursor)) {
			do {
                this.setLine(cursor);
                if (this.currentLine[0] === skipLineFrom) continue;
                skipLineFrom = -1;
                const node: CalcDecisionPoint = decisionTree[cursor.type.id as TermValue];
                const range = this.handle(cursor, node) as Range<CalcValue> | ExpressionResult | null;
                if (range === null) {
                    skipLineFrom = this.currentLine[0];
                    continue;
                }
                if ('value' in range && range.value instanceof CalcValue) {
                    pipeline.push(range);
                    if (range.value.error) {
                        skipLineFrom = this.currentLine[0];
                        continue;
                    }
                }
                else if (typeof range === 'object' && 'n' in range) {
                    const expr = range as ExpressionResult;
                    pipeline.push(calcValueFromExpr(expr).range(cursor.from, cursor.to));
                    if (expr.error) {
                        skipLineFrom = this.currentLine[0];
                        continue;
                    }
                }
			} while (this.moveToNextSibling(cursor));
			this.moveToParent(cursor);
		}
		return pipeline;
	}

    private handle(cursor: TreeCursor, point: CalcDecisionPoint): unknown | null {

        if (cursor.type.id === 0) return null;

        if (point === SKIP) return null;

        if (point === SLICE) return this.sliceDoc(cursor.from, cursor.to);

        if (typeof point === 'number') return this.handle(cursor, decisionTree[point as TermValue]);

        if (typeof point !== 'object') return null;

        if ('breakAtError' in point) {
            this.moveToFirstChild(cursor);
            do {
                if (cursor.type.id === 0) {
                    this.moveToParent(cursor);
                    return null;
                }
            } while (this.moveToNextSibling(cursor));
            this.moveToParent(cursor);
        }

        let propsResult: Record<string, unknown> | null | ExpressionResultError = {};

        if ('props' in point && point.props != undefined) {
            propsResult = this.expectChildren(cursor, point as CalcDecisionPointWithExpectations);
        }

        if (isExpressionResultError(propsResult)) return propsResult;
        if (propsResult === null) return null;

        return point.process(this, propsResult);
    }

    private moveToFirstChild(cursor: TreeCursor): boolean {
        if (cursor.firstChild()) {
            this.stack.push(cursor.type.id as TermValue);
            return true;
        }
        return false;
    }

    private moveToParent(cursor: TreeCursor): boolean {
        if (cursor.parent()) {
            this.stack.pop();
            return true;
        }
        return false;
    }

    private moveToNextSibling(cursor: TreeCursor): boolean {
        if (cursor.nextSibling()) {
            this.stack.pop();
            this.stack.push(cursor.type.id as TermValue);
            return true;
        }
        return false;
    }

    private expectChildren(cursor: TreeCursor, point: CalcDecisionPointWithExpectations): Record<string, unknown>|null|ExpressionResultError {
        if (!this.moveToFirstChild(cursor)) return null;

        const props: Record<string, unknown> = {};

        let ret: undefined|null|Record<string, unknown>|ExpressionResultError = undefined;

        for (let index = 0; index < point.props.length; index++) {
            const propDef = point.props[index];
            const isOptionalParam = Boolean('expect' in propDef && propDef.optional);
            let propResult: unknown = undefined;
            
            if ('expect' in propDef) {
                do {
                    const type = cursor.type.id as TermValue;
                    if (decisionTree[type] === SKIP) {
                        continue;
                    }
                    if (propDef.expect.includes(type)) {
                        const node: CalcDecisionPoint = decisionTree[type];
                        propResult = this.handle(cursor, node);
                        break;
                    }
                    if (isOptionalParam) {
                        // skip to the next prop
                        break;
                    }
                    propResult = expressionError(`Unexpected "${cursor.type.name}".`, cursor)
                    break;
                } while (this.moveToNextSibling(cursor));

            } else if ('expectMany' in propDef) {
                let values: unknown[] = [];
                do {
                    const type = cursor.type.id as TermValue;
                    if (propDef.expectMany.includes(type)) {
                        const node: CalcDecisionPoint = decisionTree[cursor.type.id as TermValue];
                        const val = this.handle(cursor, node);
                        if (val == null) {
                            values = [];
                            break;
                        }
                        values.push(val);
                    } 
                } while (this.moveToNextSibling(cursor));

                propResult = values;
            }

            // prevent processing, or else it forces us to handle `null` props in processors
            if (propResult == null) {
                if (isOptionalParam) {
                    // because it's optinal we just skip it
                    continue;
                }
                ret = null;
                break;
            }

            if (isExpressionResultError(propResult)) {
                const err = propResult as ExpressionResultError;
                ret = err;
                break;
            }
            

            props[propDef.key] = propResult;

            if (!this.moveToNextSibling(cursor)) {
                ret = props;
                // Check if all required params are collected
                for (let index = 0; index < point.props.length; index++) {
                    const propDef = point.props[index];
                    if (!(propDef.key in props) && !('optional' in propDef && propDef.optional)) {
                        ret = null;
                        break;
                    }
                }
                break;
            };
        }

        if (ret === undefined) ret = props;

        this.moveToParent(cursor);

        return ret;
    } 
}