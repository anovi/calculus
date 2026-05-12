import { TreeCursor } from '@lezer/common';
import { RangeValue, Range } from "@codemirror/state";

import { terms } from '../language';
import { parseNumberWithCurrency } from '../lib/currencies';
import { isNumber } from '../lib/number';

type LiteralResult = { n: number; unit?: string };


/** Represents a row of calculation; can be binded to a name or not */
export class CalcValue extends RangeValue {
    readonly result: number;
    readonly dependencies?: string[];
    readonly name?: string;
    readonly unit?: string;
    constructor(result: number, name?: string, dependencies?: string[], unit?: string) {
        super();
        this.result = result;
        this.name = name;
        this.dependencies = dependencies;
        this.unit = unit;
    }
}

type Operator = '-' | '+' | '/' | '*' | '%' | '^';

export class MathComposer {
	constructor(sliceDoc: (from: number, to: number) => string) {
		this.sliceDoc = sliceDoc;
	}
    
    bindings: Map<string, unknown> = new Map();

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
        let result: null|number = null;
        let unit: string | undefined = undefined;

        this.forEachChild(cursor, new Map<number, (childCursor: TreeCursor) => void>([
            [terms.Identifier, (childCursor) => {
                id = this.sliceDoc(childCursor.from, childCursor.to);
            }],
            [terms.Literal, (childCursor) => {
                const lit = this.processLiteral(childCursor);
                if (lit) {
                    result = lit.n;
                    unit = lit.unit;
                }
            }],
            [terms.MulExpression, (childCursor) => {
                result = this.callHandler<number>(terms.MulExpression, childCursor);
            }],
            [terms.AddExpression, (childCursor) => {
                result = this.callHandler<number>(terms.AddExpression, childCursor);
            }],
            [terms.FunctionCall, (childCursor) => {
                result = this.callHandler<number>(terms.FunctionCall, childCursor);
            }],
        ]));

        if (result !== null) {
            value = new CalcValue(result, id, undefined, unit).range(cursor.from, cursor.to);
            if (id !== undefined) this.bindings.set(id, result);
        }
        return value;
    }
    // reducer: (...values: number[]) => number
    private processExpression(cursor: TreeCursor, _type: 'plus'|'times'): number | null {
        const pipeline: number[] = [];
        let operator: Operator = '+';

        this.forEachChild(cursor, new Map<number, (childCursor: TreeCursor) => void>([
            [terms.AddExpression, (nestedCursor) => {
                const value = this.callHandler<number>(terms.AddExpression, nestedCursor);
                if (value !== null) pipeline.push(value);
            }],
            [terms.MulExpression, (nestedCursor) => {
                const value = this.callHandler<number>(terms.MulExpression, nestedCursor);
                if (value !== null) pipeline.push(value);
            }],
            [terms.Identifier, (nestedCursor) => {
                const id = this.sliceDoc(nestedCursor.from, nestedCursor.to);
                const value = this.bindings.get(id)
                if (isNumber(value)) pipeline.push(value);
            }],
            [terms.Literal, (nestedCursor) => {
                const lit = this.processLiteral(nestedCursor);
                if (lit) pipeline.push(lit.n);
            }],
            [terms.FunctionCall, (nestedCursor) => {
                const value = this.callHandler<number>(terms.FunctionCall, nestedCursor);
                if (isNumber(value)) pipeline.push(value);
            }],
            [terms.PlusBinaryOp, (cursor) => {
                operator = this.sliceDoc(cursor.from, cursor.to) as Operator;
            }],
            [terms.TimesBinaryOp, () => {
                operator = this.sliceDoc(cursor.from, cursor.to) as Operator;
            }],
        ]));

        if (pipeline.length > 0) {
            return performOperation(operator, ...pipeline)
        }
        return null;
    }

    private processAddExpression(cursor: TreeCursor): number|null {
        return this.processExpression(cursor, 'plus');
    }

    private processMulExpression(cursor: TreeCursor): number|null {
        return this.processExpression(cursor, 'times');
    }

    private processConvertExpression(_cursor: TreeCursor): null {
        return null;
    }

    private processLiteral(cursor: TreeCursor): LiteralResult | null {
        let n: number | null = null;
        let unit: string | undefined;

        this.forEachChild(cursor, new Map<number, (childCursor: TreeCursor) => void>([
            [terms.Number, (numberCursor) => {
                const v = this.callHandler<number>(terms.Number, numberCursor);
                if (v !== null) n = v;
            }],
            [terms.NumberWithUnit, (nwuCursor) => {
                const raw = this.sliceDoc(nwuCursor.from, nwuCursor.to);
                const parsed = parseNumberWithCurrency(raw);
                if (parsed) {
                    n = parsed.value;
                    unit = parsed.unit;
                }
            }],
        ]));

        if (n === null) return null;
        return { n, unit };
    }

    private processString(_cursor: TreeCursor): null {
        return null;
    }

    private processNumber(cursor: TreeCursor): number | null {
        const raw = this.sliceDoc(cursor.from, cursor.to);
        try {
            return Number.parseFloat(raw);
        } catch {}
        try {
            return Number.parseInt(raw);
        } catch {}
        return null;
    }

    private evalExpressionValue(cursor: TreeCursor): number | null {
        switch (cursor.type.id) {
            case terms.Literal:
                return this.processLiteral(cursor)?.n ?? null;
            case terms.AddExpression:
                return this.processAddExpression(cursor);
            case terms.MulExpression:
                return this.processMulExpression(cursor);
            case terms.Identifier: {
                const id = this.sliceDoc(cursor.from, cursor.to);
                const value = this.bindings.get(id);
                return isNumber(value) ? value : null;
            }
            case terms.FunctionCall:
                return this.processFunctionCall(cursor);
            default:
                return null;
        }
    }

    private processArgList(cursor: TreeCursor): number[] {
        const args: number[] = [];
        if (!cursor.firstChild()) return args;
        do {
            const value = this.evalExpressionValue(cursor);
            if (value !== null) args.push(value);
        } while (cursor.nextSibling());
        cursor.parent();
        return args;
    }

    private processFunctionCall(cursor: TreeCursor): number | null {
        let name = '';
        let args: number[] = [];
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
            return Math.sqrt(args[0]);
        }
        return null;
    }
}

function performOperation(operator: Operator, ...args: number[] ) {
    let result = args[0];
    for (let index = 1; index < args.length; index++) {
        switch (operator) {
            case '-':
                result = result - args[index]; 
                break;
            case '+':
                result = result + args[index]; 
                break;
            case '%':
                result = result % args[index]; 
                break;
            case '*':
                result = result * args[index]; 
                break;
            case '/':
                result = result / args[index]; 
                break;
            case '^':
                result = result ** args[index]; 
                break;
            default:
                throw Error(`Unknown operator ${operator}`)
        }
    }
    return result;
}
